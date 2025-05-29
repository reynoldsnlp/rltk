package werti.uima;

import org.apache.uima.analysis_engine.AnalysisEngine;
import org.apache.uima.analysis_engine.AnalysisEngineProcessException;
import org.apache.uima.cas.text.AnnotationFS;
import org.apache.uima.fit.factory.AnnotationFactory;
import org.apache.uima.fit.util.JCasUtil;
import org.apache.uima.jcas.JCas;
import org.apache.uima.jcas.tcas.Annotation;
import werti.Language;
import werti.server.enhancement.Span;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Some of UIMA's workflows are difficult to test, and sadly, uimafit's
 * static factory methods aren't the solution either.
 *
 * This class is
 * intended to give a nice programming interface to the CAS, while at
 * the same time being easily mockable for unit tests where the CAS itself
 * is not SUT.
 *
 * @author Aleksandar Dimitrov
 * @since 2016-10-06
 */
public class ConvenientCas {
    private final JCas cas;

    public ConvenientCas(JCas cas) {
        this.cas = cas;
    }

    public <T extends Annotation> T createAnnotation(
            Span span,
            Class<T> annotationClass
    ) {
        return createAnnotation(span.begin(), span.end(), annotationClass);
    }

    public <T extends Annotation> T createAnnotation(
            final int begin,
            final int end,
            Class<T> annotationClass
    ) {
        return AnnotationFactory.createAnnotation(
                getCas(),
                begin,
                end,
                annotationClass
        );
    }

    public <T extends Annotation> T createAnnotation(
            Annotation parentAnnotation,
            Class<T> annotationClass
    ) {
        return createAnnotation(
                parentAnnotation.getBegin(),
                parentAnnotation.getEnd(),
                annotationClass
        );
    }

    public JCas getCas() {
        return this.cas;
    }

    public void setDocumentLanguage(final Language language) {
        getCas().setDocumentLanguage(language.toString());
    }

    public Language getDocumentLanguage() throws UnsupportedLanguageException {
        final String languageCode = getCas().getDocumentLanguage();
        return Language.fromIsoCode(languageCode).orElseThrow(() ->
                new UnsupportedLanguageException(languageCode)
        );
    }

    public void setDocumentText(final String documentText) {
        getCas().setDocumentText(documentText);
    }

    public <T extends Annotation> Collection<T> select(final Class<T> annotationClass) {
        return JCasUtil.select(this.cas, annotationClass);
    }

    public <T extends Annotation> T selectFirst(final Class<T> annotationClass) {
        return select(annotationClass).iterator().next();
    }

    public <T extends Annotation> Collection<T> selectCovered(final Class<T> annotationClass, AnnotationFS coveringAnnotation){
        return JCasUtil.selectCovered(this.cas, annotationClass, coveringAnnotation);
    }

    public <T extends Annotation> T selectFirstCovered(final Class<T> annotationClass, AnnotationFS coveringAnnotation){
        return selectCovered(annotationClass, coveringAnnotation).iterator().next();
    }

    public Collection<Annotation> selectAll() {
        return JCasUtil.select(this.cas, Annotation.class);
    }

    public <T extends Annotation> Optional<T> getFirstAnnotationWithText(
            Class<T> annotationClass,
            String text
    ) {
        return getAnnotationsWithText(annotationClass, text).stream().findFirst();
    }

    public <T extends Annotation> List<T> getAnnotationsWithText(
            Class<T> annotationClass,
            String text
    ) {
        final Collection<T> annotations = select(annotationClass);
        return annotations.stream()
                .filter(annotation -> annotation.getCoveredText().equals(text))
                .collect(Collectors.toList());
    }

    public String getDocumentText() {
        return getCas().getDocumentText();
    }

    public void applyEngine(AnalysisEngine analysisEngine) throws AnalysisEngineProcessException {
        analysisEngine.process(cas);
    }
}
