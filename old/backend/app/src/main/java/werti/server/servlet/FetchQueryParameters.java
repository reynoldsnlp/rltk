package werti.server.servlet;

import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableMap;
import werti.Language;
import werti.server.analysis.ViewRequestException;
import werti.server.data.Activity;
import werti.server.data.Pipeline;
import werti.server.data.StringDescription;
import werti.server.data.Topic;

import javax.servlet.http.HttpServletRequest;
import java.net.URL;
import java.util.Arrays;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-11-17
 */
public class FetchQueryParameters extends ViewParameters implements UrlQueryReader {
    private final Language language;
    private final URL url;

    FetchQueryParameters(HttpServletRequest request) throws ViewRequestException {
        final Map<String, String[]> requestParameters = request.getParameterMap();
        url = parseUrl(getScalarParameter(requestParameters, "url"));
        language = parseLanguage(getScalarParameter(requestParameters, "lang"));
    }

    @Override
    public URL getUrl() {
        return url;
    }

    @Override
    public Language getLanguage() {
        return language;
    }

    @Override
    public Topic getTopic() {
        final String tokenizer = "desc/annotators/OpenNlpTokenizer";
        return Topic.builder()
                .topic("tokenizer")
                .activities(ImmutableList.of())
                .authors(ImmutableList.of())
                .description(new StringDescription("Tokenizer", "Tokenizes text."))
                .pipelines(Arrays.stream(Language.values())
                        .map(l -> Pipeline.create(tokenizer, l, ImmutableMap.of()))
                        .collect(Collectors.toList())
                ).build();
    }

    @Override
    public Activity getActivity() {
        return Activity.builder()
                .description(new StringDescription("NullActivity", "Doesnt' do anything"))
                .activity("null")
                .build();
    }
}
