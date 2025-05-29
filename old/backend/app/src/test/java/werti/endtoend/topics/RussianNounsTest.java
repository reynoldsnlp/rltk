package werti.endtoend.topics;

import com.google.gson.Gson;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import org.hamcrest.Matchers;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.parser.Tag;
import org.jsoup.select.Elements;
import org.junit.Rule;
import org.junit.Test;
import werti.server.data.JsonRequestData;
import werti.server.interaction.authentication.AuthenticationData;
import werti.server.interaction.authentication.User;
import werti.server.interaction.data.SubmissionResponse;
import werti.server.interaction.transfer.TaskRequestData;
import werti.server.interaction.transfer.TaskResponseData;
import werti.server.interaction.transfer.TrackingRequestData;
import werti.server.modules.ViewGson;
import werti.server.support.FileResource;
import werti.server.support.WithJetty;

import java.nio.charset.Charset;
import java.util.Date;

import static io.restassured.RestAssured.expect;
import static org.hamcrest.CoreMatchers.is;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.junit.Assert.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-01-15
 */
public class RussianNounsTest extends WithJetty {
    @Rule public FileResource wikipediaRusAknoSnippet =
            new FileResource("markup/wikipediaRusAknoSnippet.html");

    private Gson gson;
    private TaskRequestData taskRequestData;

    private Document enhance(FileResource fileResource, String activity) throws Exception{
        Document document = Jsoup.parse(fileResource.slurp());

        final Response response = getResponse(activity, document);
        final String content = response.getBody().asString();

        return Jsoup.parse(content);
    }

    private Response getResponse(String activity, Document document){
        final JsonRequestData request = JsonRequestData
                .builder()
                .activity(activity)
                .topic("nouns")
                .url("http://example.com")
                .language("ru")
                .document(document.body().outerHtml())
                .build();

        return expect().response().statusCode(200)
                .given()
                .contentType(ContentType.JSON.withCharset(Charset.forName("UTF-8")))
                .body(request).when().post("/view");
    }

    private String getSentenceWithOneEnhancementOnly(String enhancementId, Element enhancementElement){
        Element originalSentence = enhancementElement.parents().select("sentence:has(viewenhancement#" + enhancementId + ")").first();

        Document newDocument = Jsoup.parseBodyFragment(originalSentence.html());
        newDocument.outputSettings().prettyPrint(false);

        for(Element viewenhancement : newDocument.body().select("viewenhancement")) {
            if(viewenhancement.id().equals(enhancementId)){
                viewenhancement.replaceWith(new Element(Tag.valueOf("viewenhancement"), "").html(viewenhancement.html()));
            }
            else{
                viewenhancement.unwrap();
            }
        }

        return newDocument.body().html();
    }

    private void setup(String activity) throws Exception{
        gson = new ViewGson().getGson();

        final User user = testDatabase.newUser();
        when(authenticationService.authenticate(any(AuthenticationData.class)))
                .thenReturn(user);

        taskRequestData =
                TaskRequestData.builder()
                        .authenticationToken("you-shall-pass")
                        .url("http://example.com")
                        .title("Test test test")
                        .topic("nouns")
                        .activity(activity)
                        .language("ru")
                        .filter("any")
                        .timestamp(new Date().getTime())
                        .numberOfExercises(23)
                        .build();
    }

    private SubmissionResponse track(
            TaskResponseData task,
            String enhancementId,
            String submission,
            String correctAnswer,
            String sentence
    ) throws Exception {
        final int taskId = task.taskId();

        final TrackingRequestData trackingRequestData =
                TrackingRequestData.builder()
                        .authenticationToken("You shall pass")
                        .taskId(taskId)
                        .enhancementId(enhancementId)
                        .submission(submission)
                        .isCorrect(false)
                        .correctAnswer(correctAnswer)
                        .usedSolution(false)
                        .timestamp(System.currentTimeMillis() / 1000L)
                        .sentence(sentence)
                        .build();

        final Response trackingResponse =
                expect().response().statusCode(200)
                        .given()
                        .contentType(ContentType.JSON.withCharset(Charset.forName("UTF-8")))
                        .body(gson.toJson(trackingRequestData))
                        .when().post("/act/tracking");

        return gson.fromJson(
                trackingResponse.getBody().asString(),
                SubmissionResponse.class
        );
    }

    private TaskResponseData createTask() throws Exception {
        return gson.fromJson(
                expect().response().statusCode(200)
                        .given().body(gson.toJson(taskRequestData))
                        .when().post("/act/task")
                        .body().asString(),
                TaskResponseData.class
        );
    }

    @Test
    public void russianNounsWorksWithMadeUpWords() throws Exception {
        final Document document = Jsoup.parse(
                "<body>This is a test with some text ьяаоьяао.</body>"
        );

        final Response response = getResponse("color", document);
        final String content = response.getBody().asString();

        assertThat(
                "There should be no hits in the test text",
                content,
                not(containsString("viewenhancement"))
        );
    }

    @Test
    public void russianNounsWorksWithMultipleChoice() throws Exception {
        final Document enhancedDocument = enhance(wikipediaRusAknoSnippet, "mc");
        final Element documentBody = enhancedDocument.body();

        assertThat(
                "Content should contain a word of the input (i.e. no encoding problems)",
                documentBody.html(),
                containsString("окон")
        );

        final Elements hits = documentBody.select("viewenhancement[data-type=hit]");

        assertThat(
                "There should be many hits in the test text",
                hits.size(), Matchers.greaterThan(10)
        );

        assertThat(
                "The first noun should have the lemma этап",
                hits.get(0).attr("data-lemma"),
                is("этап")
        );
    }

    @Test
    public void russianNounsFromEnhancementToFeedbackClozeNoFV() throws Exception {
        final String activity = "cloze";
        final Document enhancedDocument = enhance(wikipediaRusAknoSnippet, activity);
        enhancedDocument.outputSettings().prettyPrint(false);

        final Element documentBody = enhancedDocument.body();

        final String correctAnswer = "окон";
        final Element enhancementElement = documentBody.select("[data-correctform=" + correctAnswer + "]").first();

        final String enhancementId = enhancementElement.id();
        final String sentence = getSentenceWithOneEnhancementOnly(enhancementId, enhancementElement);

        setup(activity);

        final TaskResponseData taskData = createTask();
        final SubmissionResponse submissionResponse = track(
                taskData,
                enhancementId,
                "окн",
                correctAnswer,
                sentence
        );

        assertThat(
                "The assessment should be a missing fleeting vowel.",
                submissionResponse.feedbackResponseData().assessment(),
                is("MISSING_FLEETING_VOWEL")
        );
    }
}
