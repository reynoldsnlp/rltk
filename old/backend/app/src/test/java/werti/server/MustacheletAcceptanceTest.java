package werti.server;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.Before;
import org.junit.Test;
import werti.server.servlet.ViewParameters;
import werti.server.support.WithJetty;

import static io.restassured.RestAssured.expect;
import static org.junit.Assert.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-08
 */
public class MustacheletAcceptanceTest extends WithJetty {
    @Before
    public void setUp() throws Exception {
        final Document document = Jsoup.parse("<b>foo</b>");
        when(urlFetcher.getDocument(any(ViewParameters.class))).thenReturn(document);
    }

    @Test
    public void testIndex() throws Exception {
        final String firstRun = expect().response().statusCode(200).when().get("/").asString();
        final String secondRun = expect().response().statusCode(200).when().get("/index.html").asString();
        assertEquals(
                "Calls to / and /index.html return the same",
                firstRun,
                secondRun
        );
    }
}
