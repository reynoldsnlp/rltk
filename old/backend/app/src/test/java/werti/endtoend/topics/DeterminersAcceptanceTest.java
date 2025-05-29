package werti.endtoend.topics;

import com.google.common.base.Stopwatch;
import io.restassured.response.Response;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.Test;
import werti.server.data.JsonRequestData;
import werti.server.support.WithJetty;

import java.util.concurrent.TimeUnit;

import static io.restassured.RestAssured.expect;
import static org.hamcrest.Matchers.is;
import static org.junit.Assert.assertThat;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-06-05
 */
public class DeterminersAcceptanceTest extends WithJetty {
    @Test
    public void germanPipelineWorks() {
        final String input = "<p>Dies ist ein Test.</p>";
        final JsonRequestData request = JsonRequestData.builder()
                       .url("http://beispiel.de")
                       .language("de")
                       .topic("determiners")
                       .activity("color")
                       .document(input)
                       .build();

        final Stopwatch timer = Stopwatch.createStarted();
        final Response response = expect().response().statusCode(200)
                .given().body(request).when().post("/view");
        final long firstTime = timer.stop().elapsed(TimeUnit.MILLISECONDS);


        final Document output = Jsoup.parse(response.body().prettyPrint());

        assertThat(
                "There should be one sentence",
                output.select("sentence").size(),
                is(1)
        );

        final Stopwatch secondTimer = Stopwatch.createStarted();
        final Response secondResponse = expect().response().statusCode(200)
                                          .given().body(request)
                                          .when().post("/view");
        final long secondTime = secondTimer.stop().elapsed(TimeUnit.MILLISECONDS);

        System.out.println("t0: " + firstTime + "; t1: " + secondTime);
    }

    @Test
    public void englishPipelineWorks() {
        final String input = "<p>This is a test.</p>";
        final JsonRequestData request = JsonRequestData
                .builder()
                .language("en")
                .topic("determiners")
                .activity("color")
                .document(input)
                .url("http://example.com")
                .build();

        final Response response = expect().response().statusCode(200)
                .given().body(request).when().post("/view");

        final Document output = Jsoup.parse(response.body().prettyPrint());

        System.out.println("document\n" + output);

        assertThat(
                "There is one sentence in the result",
                output.select("sentence").size(),
                is(1)
        );
    }
}
