package werti.endtoend.topics;

import io.restassured.response.Response;
import org.junit.Test;
import werti.server.data.JsonRequestData;
import werti.server.support.WithJetty;

import static io.restassured.RestAssured.expect;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-07-20
 */
public class GermanAgreementTest extends WithJetty {
    @Test
    public void agreementWorks() throws Exception {
        final String input = "<p>Das ist ein ganz toller Test.</p>";

        final JsonRequestData request =
                JsonRequestData.builder()
                               .url("http://beispiel.de")
                               .language("de")
                               .topic("agreement")
                               .activity("color")
                               .document(input)
                               .build();

        final Response response = expect().response().statusCode(200)
                                          .given().body(request).when().post("/view");

        response.getBody().prettyPeek();
    }
}
