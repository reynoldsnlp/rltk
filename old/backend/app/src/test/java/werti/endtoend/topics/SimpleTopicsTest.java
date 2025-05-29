package werti.endtoend.topics;

import org.jsoup.select.Elements;
import org.junit.Test;
import werti.Language;

import static org.hamcrest.Matchers.is;
import static org.junit.Assert.assertThat;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-01-21
 */
public class SimpleTopicsTest {
    @Test
    public void pipelnineWorks() throws Exception {
        final Elements enhancements = new ProcessorBuilder()
                .with("articles", Language.ENGLISH)
                .select("mc")
                .process("The Life of Brian")
                .select("viewenhancement");

        assertThat(
                "All words should be marked up",
                enhancements.size(),
                is(4)
        );

        assertThat(
                "And the first word should be 'The'",
                enhancements.get(0).text(),
                is("The")
        );
    }
}
