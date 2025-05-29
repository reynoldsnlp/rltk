package werti.server.servlet;

import com.google.auto.value.AutoValue;
import org.jsoup.nodes.Document;
import werti.Language;
import werti.server.analysis.ViewRequestException;
import werti.server.data.Activity;
import werti.server.data.Pipeline;
import werti.server.data.Topic;
import werti.server.data.ViewConfigurationException;

import javax.servlet.http.HttpServletRequest;
import java.net.URL;

/**
 * A general accessor class for parameters, that, given an {@link HttpServletRequest} can
 * extract the parameters we know about.
 *
 * @author Aleksandar Dimitrov
 * @since 2016-10-20
*/
@AutoValue
public abstract class ViewRequest {
    public abstract Language language();
    public abstract Topic topic();
    public abstract Activity activity();
    public abstract Document document();
    public abstract URL url();

    public static ViewRequest create(final ViewParameters parameters, final Document document)
            throws ViewRequestException {
        return create(
                parameters.getLanguage(),
                parameters.getTopic(),
                parameters.getActivity(),
                document,
                parameters.getUrl()
        );
    }

    public Pipeline pipeline() throws ViewConfigurationException {
        return topic().getPipelineFor(language()).orElseThrow(() -> new ViewConfigurationException(
                "Couldn't find processing pipeline for topic " + topic().topic() +
                        " and language " + language().humanLabel() + "."
        ));
    }

    public static ViewRequest create(Language language, Topic topic, Activity activity, Document document, URL url) {
        return new AutoValue_ViewRequest(language, topic, activity, document, url);
    }
}
