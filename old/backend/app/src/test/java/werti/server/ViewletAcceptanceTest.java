package werti.server;

import io.restassured.response.Response;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.Before;
import org.junit.Test;
import werti.Language;
import werti.server.data.JsonRequestData;
import werti.server.servlet.ViewParameters;
import werti.server.support.WithJetty;

import java.net.URLEncoder;

import static io.restassured.RestAssured.expect;
import static org.hamcrest.Matchers.is;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-14
 */
public class ViewletAcceptanceTest extends WithJetty {
    private String url;
    private String servletCall;
    private JsonRequestData.Builder jsonRequest;

    private static String INPUT = "<b>This is</b> quite some text.";
    private static String EXPECTED =
            "<sentence data-original-text=\"This is quite some text\" id=\"viewId-1\">" +
            "<b>" +
            "<viewenhancement data-original-text=\"This\" data-morph-pos=\"DT\" id=\"viewId-2\">" +
                "This" +
            "</viewenhancement>" +
            "<viewenhancement data-morph-pos=\"VBZ\" data-original-text=\"is\" id=\"viewId-3\">" +
                "is" +
            "</viewenhancement></b> " +
            "<viewenhancement data-original-text=\"quite\" data-morph-pos=\"RB\" id=\"viewId-4\">" +
                "quite" +
            "</viewenhancement> " +
            "<viewenhancement data-original-text=\"some\" data-morph-pos=\"DT\" id=\"viewId-5\">" +
                "some" +
            "</viewenhancement> " +
            "<viewenhancement data-original-text=\"text\" data-morph-pos=\"NN\" " + "id=\"viewId-6\">" +
                "text" +
            "</viewenhancement>." +
            "</sentence>";

    @Before
    public void setUp() throws Exception {
        injector.injectMembers(this);

        url = "https://true.aleks.bg/p/haskell-strings.html";
        Language language = Language.ENGLISH;
        final String encodedUrl = URLEncoder.encode(url, "UTF-8");
        servletCall = "/view"
                + "?url=" + encodedUrl
                + "&lang=" + language.toString()
                + "&topic=" + "determiners"
                + "&activity=" + "color";
        reset(urlFetcher);
        this.jsonRequest = JsonRequestData.builder()
                .activity("color")
                .topic("determiners")
                .url(encodedUrl)
                .language(language.toString());
    }

    @Test
    public void testPost() throws Exception {
        final Document inputDocument = Jsoup.parse(INPUT);
        final Document expectedResult = Jsoup.parse("<body>" + EXPECTED + "</body>");

        final Response response = expect().response().statusCode(200)
                .given().body(jsonRequest.document(inputDocument.body().outerHtml()).build())
                .when().post(servletCall);
        final String responseContent = response.getBody().print();
        final Document result = Jsoup.parse(responseContent, url);
        verify(urlFetcher, never()).getDocument(any(ViewParameters.class));
        assertThat(
                "The document was correctly processed.",
                result.body().outerHtml().replaceAll("\\s", ""),
                is(expectedResult.body().outerHtml().replaceAll("\\s", ""))
        );
    }

    @Test
    public void testGet() throws Exception {
        final Document inputDocument = Jsoup.parse(INPUT);
        final Document expectedResult = Jsoup.parse(
                "<body>" + EXPECTED
                        + "<script src=\"/js/activity/color.js\"></script>"
                        + "</body>"
        );

        when(urlFetcher.getDocument(any(ViewParameters.class))).thenReturn(inputDocument);

        final Response response = expect().response().statusCode(200)
                .when().get(servletCall);
        final String responseContent = response.getBody().print();
        final Document result = Jsoup.parse(responseContent, url);

        assertEquals(
                "The document was correctly processed.",
                expectedResult.body().outerHtml().replace(" ", ""),
                result.body().outerHtml().replace(" ", "")
        );
    }
}
