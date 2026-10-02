import importlib.util
from pathlib import Path

SCRIPT = Path(__file__).parent.parent / "scripts" / "precommit" / "check_internal_blog_links.py"
spec = importlib.util.spec_from_file_location("check_internal_blog_links", SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


def test_post_slugs_strip_date_prefix(tmp_path):
    (tmp_path / "2026-01-02-hello-world.md").write_text("x")
    assert mod.post_slugs(tmp_path) == {"hello-world"}


def test_find_broken_links(tmp_path):
    post = tmp_path / "p.md"
    post.write_text(
        "[ok](/blog/hello-world/)\n"
        "[bad](/blog/unpublished-post/)\n"
        "[abs](https://timetobuildbob.com/blog/also-missing/)\n"
        "[ext](https://example.com/blog/not-ours/)\n"
    )
    broken = mod.find_broken_links(post, {"hello-world"})
    assert broken == [(2, "unpublished-post"), (3, "also-missing")]
