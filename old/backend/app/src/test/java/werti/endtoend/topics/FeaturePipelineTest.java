package werti.endtoend.topics;

import com.google.common.collect.ImmutableMap;
import io.restassured.response.Response;
import org.junit.Test;
import werti.server.data.FeatureData;
import werti.server.data.FeatureRequestData;
import werti.server.support.WithJetty;

import static io.restassured.RestAssured.expect;

/**
 * @author Aleksandar Dimitrov
 * @since 2018-02-09
 */
public class FeaturePipelineTest extends WithJetty {
    private static final String INPUT_DE = "<p>Das ist ein ganz toller Test.</p><p>So geht es " +
            "nicht weiter.</p>";

    private static final FeatureRequestData.Builder FEATURES = FeatureRequestData.builder()
            .url("http://example.com");


    private Response callView(Object data) {
        final Response response = expect().response().statusCode(200)
                                          .given().body(data).when().post("/view");

        response.getBody().prettyPeek();
        return response;
    }

    @Test
    public void testLemma() {
        final FeatureRequestData requestData = FEATURES
                .language("de")
                .document(INPUT_DE)
                .features(FeatureData.create(
                        ImmutableMap.of("lemma", "true"),
                        ImmutableMap.of()
                )).build();

        callView(requestData);
    }

    @Test
    public void testGermanPos() {
        final FeatureRequestData requestData = FEATURES
                .language("de")
                .document(INPUT_DE)
                .features(FeatureData.create(
                        ImmutableMap.of("pos", "tiger"),
                        ImmutableMap.of()
                )).build();

        callView(requestData);
    }

    @Test
    public void testEnglishLemma() {
        final String input = "<p>These words needed to be added, as it were.</p>";

        final FeatureRequestData requestData = FEATURES
                .language("en")
                .document(input)
                .features(FeatureData.create(
                        ImmutableMap.of("lemma", "true"),
                        ImmutableMap.of()
                )).build();

        callView(requestData);
    }

    @Test
    public void testGermanSpacy() {
        final FeatureRequestData requestData = FEATURES
                .language("de")
                .document(INPUT_DE)
                .features(FeatureData.create(
                        ImmutableMap.of("pos", "spacy"),
                        ImmutableMap.of("dependency", "spacy")
                )).build();

        callView(requestData);
    }
}
