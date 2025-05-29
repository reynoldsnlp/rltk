package werti.server.analysis;

import org.junit.Rule;
import org.junit.Test;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnit;
import org.mockito.junit.MockitoRule;
import werti.uima.ConvenientCas;
import werti.uima.types.annot.HtmlAnnotation;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-06
 */
public class AnnotationStubTest {
    @Rule public MockitoRule rule = MockitoJUnit.rule();

    @Mock private ConvenientCas cas;
    @Mock private HtmlAnnotation htmlAnnotation;

    @Test
    public void testHtmlAnnotationCreation() {
        // given
        final HtmlAnnotationStub htmlAnnotationStub =
                new HtmlAnnotationStub("html", 0, 10);
        when(cas.createAnnotation(0, 10, HtmlAnnotation.class))
                .thenReturn(this.htmlAnnotation);

        // when
        htmlAnnotationStub.addToCas(cas);

        // then
        verify(htmlAnnotation).setTagName("html");
    }
}
