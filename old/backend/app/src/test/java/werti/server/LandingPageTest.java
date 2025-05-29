package werti.server;

import com.google.inject.Inject;
import org.junit.Before;
import org.junit.Ignore;
import org.junit.Test;
import werti.Language;
import werti.server.data.Topics;
import werti.server.support.WithFrontend;

import java.util.Arrays;

import static org.hamcrest.Matchers.is;
import static org.junit.Assert.assertThat;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-26
 */
public class LandingPageTest extends WithFrontend {
    @Inject private Topics topics;

    @Before
    public void setUp() {
        landingPage.goTo();
        injector.injectMembers(this);
    }

    @Test @Ignore
    public void allLanguagesAreThere() throws Exception {
        assertThat(
                "All languages show up as supported languages",
                landingPage.findSupportedLanguages().size(),
                is(Language.values().length)
        );
    }

    @Test @Ignore
    public void inventoryIsCorrect() throws Exception {
        Arrays.stream(Language.values()).forEach(this::takeStockOfTopicsFor);
    }

    private void takeStockOfTopicsFor(final Language language) {
        landingPage.selectLanguage(language);
        topics.getTopicsFor(language).forEach(topic -> {
            landingPage.selectTopic(topic);
            landingPage.topicIsVisible(language, topic);
            topic.activities().forEach(activity ->
                    landingPage.activityIsVisible(language, topic, activity)
            );
        });
    }
}
