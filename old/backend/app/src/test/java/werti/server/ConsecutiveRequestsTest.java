package werti.server;

import com.google.inject.Inject;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.Before;
import org.junit.Test;
import werti.Language;
import werti.server.data.Activity;
import werti.server.data.Topic;
import werti.server.data.Topics;
import werti.server.servlet.ViewParameters;
import werti.server.support.WithJetty;

import java.net.URL;
import java.net.URLEncoder;

import static io.restassured.RestAssured.expect;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.junit.Assert.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Checks if the CAS was properly re-initialized between two requests.
 * See #103
 *
 * @author Aleksandar Dimitrov
 * @since 2016-10-31
 */
public class ConsecutiveRequestsTest extends WithJetty {
    @Inject private Topics topics;

    @Before
    public void setUp() throws Exception {
        injector.injectMembers(this);
    }

    private String request(
            final String documentText,
            final String topicName,
            final String activityName,
            final URL remoteUrl
    ) throws Exception {
        final Language english = Language.ENGLISH;
        final Document document = Jsoup.parse(documentText);
        final Topic topic = topics.get(topicName, english).get();
        final Activity activity = topic.selectActivity(activityName).get();

        when(urlFetcher.getDocument(any(ViewParameters.class))).thenReturn(document);
        final URL requestUrl = new URL(
                jettyBaseUrl + "/view" + "?lang=" + english.toString() +
                        "&topic=" + topic.topic() +
                        "&activity=" + activity.activity() +
                        "&url=" + URLEncoder.encode(remoteUrl.toString(), "UTF-8")
        );

        return expect().response().statusCode(200).when()
                .get(requestUrl).asString();
    }

    @Test
    public void testConsecutiveCalls() throws Exception {
        request(
                "<p>First test</p>",
                "articles",
                "click",
                new URL("http://example.com")
        );
        final String secondResponse = request(
                "<p>Second test</p>",
                "determiners",
                "color",
                new URL("http://example.net")
        );
        assertThat(
                "Second response doesn't contain the first one",
                secondResponse,
                not(containsString("First"))
        );
    }
}
