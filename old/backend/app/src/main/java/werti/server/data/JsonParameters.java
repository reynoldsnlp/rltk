package werti.server.data;

import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableMap;
import com.google.gson.Gson;
import org.apache.commons.io.IOUtils;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import werti.Language;
import werti.server.analysis.ViewRequestException;
import werti.server.servlet.ViewParameters;

import javax.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.net.URL;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-11-17
 */
public class JsonParameters extends ViewParameters {
    private final Document document;
    private final Activity activity;
    private final URL url;
    private final Language language;
    private final Topic topic;

    public JsonParameters(Topics topics, HttpServletRequest request, final Gson gson)
        throws ViewRequestException {
        final String payload;
        try {
            payload = IOUtils.toString(request.getReader());
        } catch (IOException e) {
            throw new ViewRequestException(e);
        }

        if (payload.contains("\"features\":")) {
            final FeatureRequestData data = gson.fromJson(payload, FeatureRequestData.class);
            this.url = parseUrl(data.url());
            this.language = parseLanguage(data.language());
            this.document = Jsoup.parse(data.document(), data.url());

            try {
                final Pipeline featurePipeline = Pipeline.createFromFeatureSpec(this.language, data .features());
                final Activity dummyActivity = Activity.create(
                        "dummyActivity",
                        new StringDescription("generatedActivity", "dummy activity"),
                        EnhancerSettings.create("werti.uima.enhancer.Enhancements", ImmutableMap.of())
                );
                this.activity = dummyActivity;
                this.topic = Topic.create(
                        "generatedTopic",
                        ImmutableList.of(),
                        ImmutableList.of(featurePipeline),
                        new StringDescription("generated", "generated topic"),
                        ImmutableList.of(dummyActivity)
                );
            } catch (NoPipelineForFeaturesException e) {
                throw new ViewRequestException(e);
            }
        } else {
            final JsonRequestData data = gson.fromJson(payload, JsonRequestData.class);
            this.url = parseUrl(data.url());
            this.language = parseLanguage(data.language());
            this.topic = parseTopic(data.topic(), topics, this.language);
            this.activity = parseActivity(data.activity(), this.topic);
            this.document = Jsoup.parse(data.document(), data.url());
        }
    }

    @Override
    public URL getUrl() {
        return this.url;
    }

    @Override
    public Topic getTopic() {
        return this.topic;
    }

    @Override
    public Activity getActivity() {
        return this.activity;
    }

    @Override
    public Language getLanguage() {
        return this.language;
    }

    public Document getDocument() {
        return this.document;
    }
}
