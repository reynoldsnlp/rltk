package werti.server.interaction.feedback;

import werti.server.analysis.ViewRequestException;
import werti.server.interaction.data.Feedback;
import werti.server.interaction.data.Task;
import werti.server.interaction.transfer.TrackingRequestData;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-04-22
 */
public interface FeedbackEngine {
    Feedback getFeedbackFor(
            Task task,
            TrackingRequestData requestData
    ) throws ViewRequestException;
}
