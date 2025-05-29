package werti.endtoend.topics;

import org.jsoup.nodes.Document;
import org.junit.Test;
import werti.Language;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.junit.Assert.assertThat;

/**
 * See <a href="https://git.aleks.bg/view/view/issues/197">#197</a>.
 *
 * @author Aleksandar Dimitrov
 * @since 2017-01-21
 */
public class WhitespaceAroundTagsTest {
    @Test
    public void tokensDontContainExtraneousWhitespace() throws Exception {
        final Document result = new ProcessorBuilder()
                .with("nouns", Language.RUSSIAN)
                .select("click")
                .process(
                        "<p><b>Усвое́ние языка́</b>&#160;— процесс обучения человека языку, исследуемый"
                );

        assertThat(
                "The result should not contain any newlines, just like the input.",
                result.body().outerHtml(),
                not(containsString("\n"))
        );
    }
}
