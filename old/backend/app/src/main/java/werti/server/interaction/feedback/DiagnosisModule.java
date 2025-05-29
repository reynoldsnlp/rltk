package werti.server.interaction.feedback;

import werti.server.interaction.data.Feedback;
import werti.uima.ConvenientCas;

/**
 * @author Eduard Schaf
 * @since 24.04.17
 */
public interface DiagnosisModule {
    Feedback getFeedback(ConvenientCas cas);
}
