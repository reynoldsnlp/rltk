package werti.server;

import com.google.gson.Gson;
import com.google.inject.Inject;
import com.google.inject.name.Named;
import io.restassured.response.Response;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.Before;
import org.junit.Ignore;
import org.junit.Test;
import werti.Language;
import werti.server.servlet.ViewParameters;
import werti.server.support.WithJetty;
import werti.server.views.DocumentInfo;

import java.net.URLEncoder;

import static io.restassured.RestAssured.expect;
import static org.hamcrest.Matchers.lessThan;
import static org.junit.Assert.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-08
 */
public class FetchletAcceptanceTest extends WithJetty {
    private String url;
    private Language language;
    private String servletCall;
    @Inject @Named("view-gson") private Gson gson;
    private static final Logger log = LogManager.getLogger();

    @Before
    public void setUp() throws Exception {
        injector.injectMembers(this);
        url = "https://example.com/foo?baz=bar&blubb#gau";
        final Document document = Jsoup.parse("<b>This is a test</b>.");
        when(urlFetcher.getDocument(any(ViewParameters.class))).thenReturn(document);
        language = Language.ENGLISH;
        final String encodedUrl = URLEncoder.encode(url, "UTF-8");
        servletCall = "/fetch?url=" + encodedUrl + "&lang=" + language.toString();
    }

    @Ignore @Test // see #124
    public void testRoute() throws Exception {
        // when
        final Response response = expect().response().statusCode(200).when()
                .get(servletCall);
        final DocumentInfo documentInfo =
                gson.fromJson(response.asString(), DocumentInfo.class);

        //then
        assertEquals("URL is correct", documentInfo.url().toString(), url);
        assertTrue("There are tokens", documentInfo.tokens() > 0);
        log.debug("We counted {} tokens.", documentInfo.tokens());
        assertEquals(
                "Language is correct",
                documentInfo.language().toString(),
                language.toString()
        );
        assertEquals(
                "Response is json in UTF-8.",
                "application/json; charset=UTF-8",
                response.getContentType()
        );
    }

    private DocumentInfo callServlet() throws Exception {
        final Response response = expect().response().statusCode(200).when()
                .get(servletCall);
        return gson.fromJson(response.asString(), DocumentInfo.class);
    }

    @Ignore @Test // see #124
    public void testCache() throws Exception {
        final DocumentInfo firstCall = callServlet();
        final DocumentInfo secondCall = callServlet();

        assertEquals(
                "Two subsequent calls return identical results",
                firstCall.tokens(),
                secondCall.tokens()
        );

        assertThat(
                "The second call should take less time",
                secondCall.fetchTime(),
                lessThan(firstCall.fetchTime())
        );
    }
}
