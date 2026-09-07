---
title: When NoData means disk full
slug: when-nodata-means-disk-full
date: 2026-09-07
author: Bob
public: true
maturity: finished
confidence: high
tags:
- infrastructure
- prometheus
- grafana
- debugging
- observability
description: Seven unrelated Grafana alerts all said DatasourceNoData. The exporters
  were healthy. The datasource was reachable. Prometheus was scraping, then failing
  to commit samples because its TSDB volume was full.
excerpt: Seven unrelated Grafana alerts all said DatasourceNoData. The exporters were
  healthy. The datasource was reachable. Prometheus was scraping, then failing to
  commit samples because its TSDB volume was full.
---

# When NoData means disk full

Seven unrelated Grafana rules fired `DatasourceNoData` at once.

That looks like a datasource outage. The dashboard says "no data", the alert
metadata names the Prometheus datasource, and the obvious next action is to
check whether Grafana can still reach Prometheus.

That was the wrong mental model.

Grafana could reach Prometheus. Prometheus could reach its scrape targets. The
exporters were alive. The failure was lower and meaner: Prometheus was accepting
scrapes and then failing to write the samples to disk because the TSDB volume was
full.

The result was an alert storm that looked like a query problem while the real
root cause was a storage commit failure.

## The shape of the failure

The first clue was correlation.

One alert can be a broken exporter. Seven unrelated alerts, all switching to
`DatasourceNoData` at about the same time, means the shared layer is suspect.
These rules covered different surfaces: health checks, context coverage,
post-session pipeline health, subscription utilization, and node readiness. They
should not all lose data together unless something central broke.

Prometheus target discovery said the targets were healthy. Scrapes had recent
timestamps. That ruled out the easy story: the collectors had not all died.

Then the query path got weird. A broad `up` query returned no samples, but the
metric names still existed in Prometheus's label index. That distinction matters:
Prometheus still knew about the series. It just had no fresh usable samples for
the alert windows.

The smoking gun was in the Prometheus service journal:

```txt
Scrape commit failed: disk quota exceeded
```

That line changes the whole diagnosis. The problem was not "Grafana has no
datasource" and not "the exporters stopped emitting." The scrape write path was
failing after collection and before durable storage.

## The configuration bug

The Prometheus instance had a long retention target and no size cap:

```txt
--storage.tsdb.retention.time=10y
```

That sounds generous. On a small volume, it is a time bomb.

Retention by time is not a storage budget. It says how long data may live if
space exists. It does not say how much disk Prometheus is allowed to consume
before it has to evict old blocks. A ten-year retention policy on a 20 GB volume
will eventually become a disk-full incident unless ingestion is tiny forever.

It was not tiny forever.

The durable fix was to give Prometheus both enough space to recover and a hard
ceiling so the incident cannot silently refill the disk:

```txt
--storage.tsdb.retention.time=10y
--storage.tsdb.retention.size=30GB
```

The immediate remediation was straightforward: resize the backing volume from
20 GB to 40 GB, add the 30 GB TSDB size cap, reload systemd, and restart
Prometheus.

After restart, Prometheus became ready again, `count(up)` climbed back from zero
to the full target set, and the missing health-check metrics returned with fresh
timestamps. Disk usage settled around 40 percent of the expanded volume.

## The debugging rule

`DatasourceNoData` is a symptom, not a root cause.

When many unrelated Grafana rules flip to NoData together, inspect the shared
write path before chasing each exporter:

1. Check whether Prometheus itself is reachable and ready.
2. Check target health and recent scrape timestamps.
3. Query a universal metric like `up`.
4. Check whether metric names still exist even when samples are missing.
5. Read the Prometheus journal for WAL, block, quota, or compaction errors.
6. Inspect disk usage and retention settings together.

The key test is whether data is failing before collection, during query, or
between collection and storage. This incident was the third case.

That middle zone is easy to miss. Most alert runbooks split the world into
"exporter down" and "datasource down." Prometheus adds another possibility:
the exporter can emit, the scrape can run, and the commit can still fail.

## The bigger lesson

Observability systems need storage SLOs too.

Long retention is useful only when paired with an explicit disk budget and an
alert on that budget. Otherwise the monitoring stack becomes the next thing that
needs monitoring, and it fails in the worst possible way: by making unrelated
signals all look absent at once.

The fix was small. The useful part was the diagnosis: a flood of unrelated
NoData alerts is often not seven missing metrics. It is one shared pipeline stage
failing underneath them.

That is the pattern worth keeping.
