package werti.server.servlet;

import werti.server.analysis.ViewRequestException;
import werti.server.data.Activity;
import werti.server.data.Topic;
import werti.server.data.Topics;

import javax.servlet.http.HttpServletRequest;
import java.util.Map;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-11-17
 */
public class ViewQueryParameters extends FetchQueryParameters {
    private final Topic topic;
    private final Activity activity;

    ViewQueryParameters(
            final Topics topics,
            final HttpServletRequest request
    ) throws ViewRequestException {
        super(request);
        final Map<String, String[]> requestParameters = request.getParameterMap();
        this.topic = parseTopic(getScalarParameter(requestParameters, "topic"), topics, getLanguage());
        this.activity = parseActivity(getScalarParameter(requestParameters, "activity"), getTopic());
    }

    @Override
    public Topic getTopic() {
        return this.topic;
    }

    @Override
    public Activity getActivity() {
        return this.activity;
    }
}
