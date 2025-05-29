package werti.server.servlet;

import werti.Language;
import werti.server.analysis.ViewRequestException;
import werti.server.data.Activity;
import werti.server.data.Topic;
import werti.server.data.Topics;

import javax.annotation.Nullable;
import javax.servlet.http.HttpServletResponse;
import java.io.UnsupportedEncodingException;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLDecoder;
import java.util.Optional;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-11-17
 */
public abstract class ViewParameters {
    public abstract URL getUrl();
    public abstract Topic getTopic();
    public abstract Activity getActivity();
    public abstract Language getLanguage();

    protected final URL parseUrl(@Nullable String string)
            throws ViewRequestException {

        final String urlParameter = Optional.ofNullable(string)
                .orElseThrow(() -> new ViewRequestException("No Url given!"));
        try {
            final String decodedString = URLDecoder.decode(urlParameter, "UTF-8");
            if (decodedString.startsWith("http")) {
                return new URL(decodedString);
            } else {
                return new URL("http://" + decodedString);
            }
        } catch (MalformedURLException e) {
            throw new ViewRequestException(
                    "Invalid URL: " + e.getMessage(),
                    e,
                    HttpServletResponse.SC_BAD_REQUEST
            );
        } catch (UnsupportedEncodingException e) {
            throw new ViewRequestException(
                    "Somehow, we don't support UTF-8!",
                    e,
                    HttpServletResponse.SC_INTERNAL_SERVER_ERROR
            );
        }
    }

    protected final Language parseLanguage(@Nullable String string)
            throws ViewRequestException {
        final String languageCode = Optional.ofNullable(string)
                .orElseThrow(() -> new ViewRequestException("No language given!"));
        return Language.fromIsoCode(languageCode).orElseThrow(
                () -> new ViewRequestException(
                        "Expected valid language code language, got " + languageCode
                ));
    }

    protected final Topic parseTopic(
            @Nullable String string,
            final Topics topics,
            final Language language
    ) throws ViewRequestException {
        final String topicName = Optional.ofNullable(string)
                .orElseThrow(() -> new ViewRequestException("No topic specified!"));
        return topics.get(topicName, language)
                .orElseThrow(() -> new ViewRequestException(
                        "Topic " + topicName + " not found for language " + language
                ));
    }

    protected final Activity parseActivity(
            @Nullable String string,
            final Topic topic
    ) throws ViewRequestException {
        final String activityName = Optional.ofNullable(string)
                .orElseThrow(() -> new ViewRequestException("No activity specified!"));
        return topic.selectActivity(activityName)
                .orElseThrow(() -> new ViewRequestException(
                        "Activity " + activityName + " not found for " + topic.topic()
                ));
    }
}
