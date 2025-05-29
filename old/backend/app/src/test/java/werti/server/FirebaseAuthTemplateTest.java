package werti.server;

import com.google.common.collect.ImmutableMap;
import org.junit.Test;
import org.trimou.Mustache;
import org.trimou.engine.MustacheEngine;
import org.trimou.engine.MustacheEngineBuilder;
import org.trimou.minify.Minify;
import werti.endtoend.topics.TestTopics;
import werti.server.views.FirebaseApiData;
import werti.server.views.DefaultView;

import static org.hamcrest.Matchers.is;
import static org.junit.Assert.assertThat;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-03-09
 */
public class FirebaseAuthTemplateTest {
    @Test
    public void firebaseAuthDataIsAccessibleInTheTemplate() throws Exception {
        final MustacheEngine mustacheEngine = MustacheEngineBuilder.newBuilder()
                .addMustacheListener(Minify.htmlListener())
                .build();
        final FirebaseApiData data = FirebaseApiData.builder()
                .apiKey("apiKey")
                .authDomain("authDomain")
                .databaseUrl("databaseUrl")
                .storageBucket("storageBucket").build();

        final DefaultView view = new DefaultView(TestTopics.getMockTopics(), data);

        final Mustache mustache = mustacheEngine.compileMustache(
                "test",
                        "{{#view}}{{#firebaseApiData}}" +
                                "{{apiKey}} {{authDomain}} {{databaseUrl}} {{storageBucket}}" +
                                "{{/firebaseApiData}}{{/view}}"
        );

        final String result = mustache.render(ImmutableMap.of("view", view));

        assertThat(
                "The auth data should be correctly rendered by mustache",
                result,
                is("apiKey authDomain databaseUrl storageBucket")
        );
    }
}
