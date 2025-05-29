package werti.uima.ae.util;

import com.google.gson.Gson;
import org.apache.http.HttpEntity;
import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import werti.Language;
import werti.ViewContext;
import werti.ViewContextException;

import javax.inject.Inject;
import javax.inject.Named;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.UnsupportedEncodingException;
import java.net.MalformedURLException;
import java.net.URL;

/**
 * @author Aleksandar Dimitrov
 * @since 2018-02-10
 */
public class SpacyApi {
    private final URL endpoint;
    private final HttpClient httpClient;
    private final Gson gson;

    @Inject
    public SpacyApi(
            ViewContext context,
            @Named("view-gson") Gson gson,
            HttpClient httpClient
    ) throws ViewContextException {
        final String endpointValue = context.getProperty("spacy.endpoint");
        if (endpointValue == null) {
            throw new ViewContextException("No value set for spacy endpoint!");
        }
        try {
            endpoint = new URL(endpointValue);
        } catch (MalformedURLException e) {
            throw new ViewContextException(e);
        }
        
        this.httpClient = httpClient;
        this.gson = gson;
    }

    public SpacyResult getAnalysisFor(Language language, String text) throws SpacyException {
        final HttpPost post = new HttpPost(this.endpoint.toString());
        final SpacyRequest request = SpacyRequest.create(text, language.toString());
        final HttpEntity body;
        try {
            body = new StringEntity(
                    gson.toJson(request),
                    "application/json",
                    "UTF-8"
            );
        } catch (UnsupportedEncodingException e) {
            throw new SpacyException(e);
        }

        post.setEntity(body);

        final HttpResponse response;
        try {
            response = httpClient.execute(post);
        } catch (IOException e) {
            throw new SpacyException(e);
        }

        final SpacyResult result;
        try (InputStreamReader responseReader = new InputStreamReader(response.getEntity().getContent())) {
            result = gson.fromJson(responseReader, SpacyResult.class);
        } catch (IOException e) {
            throw new SpacyException(e);
        }

        return result;
    }
}
