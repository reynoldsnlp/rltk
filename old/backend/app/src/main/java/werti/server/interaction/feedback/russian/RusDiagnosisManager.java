package werti.server.interaction.feedback.russian;

import com.google.common.collect.ImmutableList;
import werti.server.interaction.data.AnswerAssessment;
import werti.server.interaction.data.Feedback;
import werti.server.interaction.data.Task;
import werti.server.interaction.feedback.DiagnosisModule;
import werti.server.interaction.feedback.FeedbackComparator;
import werti.uima.ConvenientCas;

import javax.inject.Inject;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import static werti.server.interaction.data.AnswerAssessment.*;

/**
 * @author Eduard Schaf
 * @since 26.04.17
 */
public class RusDiagnosisManager {
    private final RusWordChoiceDiagnosis rusWordChoiceDiagnosis;
    private final RusWordFormDiagnosis rusWordFormDiagnosis;
    private final RusStemDiagnosis rusStemDiagnosis;
    private final RusSpellingDiagnosis rusSpellingDiagnosis;
    private List<AnswerAssessment> answerAssessmentPriorityList;

    @Inject
    public RusDiagnosisManager(
            final RusWordChoiceDiagnosis rusWordChoiceDiagnosis,
            final RusWordFormDiagnosis rusWordFormDiagnosis,
            final RusStemDiagnosis rusStemDiagnosis,
            final RusSpellingDiagnosis rusSpellingDiagnosis
    ) {
        this.rusWordChoiceDiagnosis = rusWordChoiceDiagnosis;
        this.rusWordFormDiagnosis = rusWordFormDiagnosis;
        this.rusStemDiagnosis = rusStemDiagnosis;
        this.rusSpellingDiagnosis = rusSpellingDiagnosis;

        answerAssessmentPriorityList = new ArrayList<>(Arrays.asList(
                WORD_CHOICE,
                WORD_FORM,
                STEM,
                SPELLING,
                UNKNOWN
        ));
    }

    /**
     * Depending on activity, init the corresponding
     * diagnosis module list.
     *
     * @param task Task for which we make the diagnosis
     */
    private List<DiagnosisModule> initModules(Task task) {
        final String activityName = task.activity().activity();

        if ("click".equals(activityName)) {
            return initClickModules();
        } else if ("mc".equals(activityName)) {
            return initMcModules();
        } else if ("cloze".equals(activityName)) {
            return initClozeModules();
        }
        return ImmutableList.of();
    }

    /**
     * Init the diagnosis module of the click activity.
     */
    private List<DiagnosisModule> initClickModules() {
        return ImmutableList.of(
                rusWordChoiceDiagnosis
        );
    }

    /**
     * Init the diagnosis module of the mc activity.
     */
    private List<DiagnosisModule> initMcModules() {
        return ImmutableList.of(
                rusWordFormDiagnosis
        );
    }

    /**
     * Init the diagnosis modules of the cloze activity.
     */
    private List<DiagnosisModule> initClozeModules() {
        return ImmutableList.of(
                rusWordChoiceDiagnosis,
                rusWordFormDiagnosis,
                rusStemDiagnosis,
                rusSpellingDiagnosis
        );
    }

    /**
     * Get the best feedback from the diagnosis module list
     * with help of the priority list.
     *
     * @param cas the current cas
     * @param task The task to use for generating the diagnosis modules
     * @return the best feedback according to the priority list
     */
    Feedback getBestFeedback(
            ConvenientCas cas,
            Task task
    ){
        final List<DiagnosisModule> modules = initModules(task);
        List<Feedback> feedbackList = modules
                .stream()
                .map(diagnosisModule -> diagnosisModule.getFeedback(cas))
                .collect(Collectors.toList());

        feedbackList.sort(new FeedbackComparator(answerAssessmentPriorityList));

        return feedbackList.get(0);
    }
}
