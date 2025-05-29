package werti.server;

import io.restassured.http.ContentType;
import io.restassured.response.Response;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.Before;
import org.junit.Test;
import werti.Language;
import werti.server.data.JsonRequestData;
import werti.server.servlet.ViewParameters;
import werti.server.support.WithJetty;

import static io.restassured.RestAssured.expect;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-12-08
 */
public class EncodingTest extends WithJetty {
    private static final String baseUri = "https://en.wikipedia.org/wiki/Napoleon";
    private static final String unicodeText = "Тест за Кирилица";

    private Document document;

    @Before
    public void setUp() throws Exception {
        document = Jsoup.parse(unicodeText);
        when(urlFetcher.getDocument(any(ViewParameters.class))).thenReturn(document);
    }

    @Test
    public void doesNotMangleUnicodeInPost() throws Exception {
        final JsonRequestData jsonRequest = JsonRequestData
                .builder()
                .activity("color")
                .topic("determiners")
                .url(baseUri)
                .language(Language.ENGLISH.toString())
                .document(document.body().outerHtml())
                .build();

        final Response response = expect().response().statusCode(200).given()
                                          .contentType(ContentType.JSON)
                                          .body(jsonRequest).when().post("/view");
        final String responseContent = response.getBody().print();
        assertThat(
                "Unicode characters should not be mangled in POST",
                responseContent,
                containsString(unicodeText)
        );
    }

    @Test
    public void doesNotMangleUnicodeInGet() throws Exception {
        final String servletCall = "/view"
                + "?url=" + baseUri
                + "&lang=" + Language.ENGLISH.toString()
                + "&topic=" + "determiners"
                + "&activity=" + "color";

        final Response response = expect().response().statusCode(200).when().get(servletCall);
        final String responseContent = response.getBody().print();
        assertThat(
                "Unicode characters should not be mangled in GET",
                responseContent,
                containsString(unicodeText)
        );
    }
}
