package werti.server.interaction.data;

import com.google.auto.value.AutoValue;
import com.google.common.collect.ImmutableMap;
import org.trimou.engine.MustacheEngine;
import werti.server.interaction.feedback.FeedbackMessage;

import java.util.Map;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-04-22
 */
@AutoValue
public abstract class Feedback {
    public abstract FeedbackMessage feedbackMessage();
    public abstract Map<String, Object> messageParameters();

    public static Feedback create(
            FeedbackMessage feedbackMessage,
            Map<String, Object> messageParameters
    ) {
        return new AutoValue_Feedback(feedbackMessage, messageParameters);
    }

    public static Feedback create(FeedbackMessage feedbackMessage) {
        return create(feedbackMessage, ImmutableMap.of());
    }

    String renderWith(MustacheEngine mustacheEngine) {
        return mustacheEngine.getMustache(feedbackMessage().getTemplateName())
                      .render(messageParameters());
    }
}
