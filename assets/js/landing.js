/* Public, dated activity only. Text goes through textContent, never HTML. */
(async () => {
  const container = document.getElementById('weekly-activity');
  if (!container) return;
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  try {
    const response = await fetch('/activity/this-week.json', { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('Snapshot unavailable');
    const data = await response.json();
    const date = new Date(data.generated_at);
    if (!Number.isFinite(data.prs_merged) || !Number.isFinite(data.repos_touched) ||
        !Array.isArray(data.top_repos) || Number.isNaN(date.valueOf())) {
      throw new Error('Invalid snapshot');
    }
    const tiles = [[data.prs_merged, 'PRs merged'], [data.repos_touched, 'repositories touched']].map(([value, label]) => {
      const tile = element('div', 'activity-tile');
      tile.append(element('strong', '', value.toLocaleString()), element('span', '', label));
      return tile;
    });
    const repos = element('div', 'activity-repos');
    repos.append(element('h3', '', 'Merged PRs by repository'));
    for (const [repo, count] of data.top_repos.slice(0, 3)) {
      if (typeof repo !== 'string' || !Number.isFinite(count) || count < 0) continue;
      const row = element('div', 'repo-row');
      row.append(element('span', '', repo), element('strong', '', count));
      const track = element('div', 'repo-track');
      const bar = element('div', 'repo-bar');
      bar.style.width = `${Math.min(100, count / Math.max(1, data.prs_merged) * 100)}%`;
      track.append(bar);
      row.append(track);
      repos.append(row);
    }
    container.replaceChildren(...tiles, repos);
    const note = document.getElementById('snapshot-note');
    note.prepend(document.createTextNode(`Snapshot: ${date.toISOString().slice(0, 10)} UTC. `));
  } catch {
    container.replaceChildren(element('p', '', 'Snapshot unavailable. Browse GitHub for current activity.'));
  }
})();
