package werti.endtoend.topics;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.hamcrest.Matchers;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.junit.Test;
import werti.Language;

import java.util.List;

import static java.util.stream.Collectors.toList;
import static org.junit.Assert.assertThat;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-01-22
 */
public class BlockLevelElementsWithoutSpacesTest {
    private final static Logger log = LogManager.getLogger();

    // See #203 — when a block-level element doesn't have a space between the tags, such as
    // <li>no</li><li>space</li>, the cas ends up with "nospace" as text, which gets tokenized as
    // one token, and thus the enhancements goes *over* both <li> elements.
    @Test
    public void dealsWithBlockElementsNotHavingASpaceBetweenThem() throws Exception {
        final Document input = Jsoup.parse(
                "<ul>" +
                        "<li>the</li>" +
                        "<li>heart</li>" +
                        "<li>of</li>" +
                        "<li>a</li>" +
                        "<li>lion</li>" +
                        "</ul>"
        );

        final Document result = new ProcessorBuilder()
                .with("articles", Language.ENGLISH)
                .select("click")
                .process(input);

        List<String> enhancementText =
                result.select("viewEnhancement")
                      .stream().map(Element::text)
                      .collect(toList());

        assertThat(
                "The five tokens should correspond to the five view enhancements",
                enhancementText,
                Matchers.contains("the", "heart", "of", "a", "lion")
        );
    }
}
