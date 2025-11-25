# _plugins/pgn.rb
# A Jekyll preprocessor that replaces <pgn>...</pgn> with a script tag
# containing the raw PGN content exactly as written in the markdown file.

module Jekyll
  class PGNTag < Jekyll::Generator
    safe true
    priority :low

    def generate(site)
      site.pages.each { |p| process_document(p) }
      site.posts.docs.each { |p| process_document(p) }
    end

    def process_document(doc)
      return unless doc.output_ext == ".html"

      if doc.content.include?("<pgn>")
        doc.content = doc.content.gsub(/<pgn>(.*?)<\/pgn>/m) do
          pgn_raw = Regexp.last_match(1)

          # Remove only a single leading newline if present.
          pgn_clean = pgn_raw.sub(/\A\n/, "")

          <<~HTML
            <div class="pgn-viewer"></div>
            <script type="text/plain" class="pgn-source">
#{pgn_clean}
            </script>
          HTML
        end
      end
    end
  end
end
