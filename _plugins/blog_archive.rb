# Generates /blog/archive/YYYY-MM/ pages so /blog/ only has to list recent posts.
require "time" # Time.parse lives in the stdlib "time" library, not core.

module BlogArchive
  class Generator < Jekyll::Generator
    safe true

    def generate(site)
      months = site.posts.docs.select { |p| p.date }.group_by { |p| p.date.strftime("%Y-%m") }
      site.data["blog_months"] = months.keys.sort.reverse.map do |m|
        { "month" => m, "label" => Time.parse("#{m}-01").strftime("%B %Y"), "count" => months[m].size }
      end
      months.each do |m, posts|
        page = Jekyll::PageWithoutAFile.new(site, site.source, "blog/archive/#{m}", "index.html")
        page.data.merge!(
          "layout" => "blog-archive",
          "title" => "Blog archive: #{Time.parse("#{m}-01").strftime("%B %Y")}",
          "description" => "All posts from #{Time.parse("#{m}-01").strftime("%B %Y")}",
          "hero" => true,
          "month_posts" => posts.sort_by(&:date).reverse
        )
        site.pages << page
      end
    end
  end
end
