package werti.server.analysis;

import com.google.common.collect.ImmutableList;
import com.google.inject.util.Providers;
import org.hamcrest.Matchers;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.Captor;
import org.mockito.runners.MockitoJUnitRunner;
import werti.Language;
import werti.server.UimaTestService;
import werti.server.data.Activity;
import werti.server.data.EnhancerSettings;
import werti.server.data.Topic;
import werti.server.enhancement.CasEnhancer;
import werti.server.enhancement.Enhancement;
import werti.server.enhancement.SentenceEnhancement;
import werti.server.enhancement.ViewEnhancement;
import werti.server.servlet.ViewRequest;
import werti.uima.ConvenientCas;
import werti.uima.enhancer.EnhancementGenerator;
import werti.uima.enhancer.SentenceEnhancementsGenerator;
import werti.uima.types.annot.SentenceAnnotation;

import java.net.URL;
import java.util.ArrayList;
import java.util.List;

import static org.junit.Assert.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-04-21
 */
@RunWith(MockitoJUnitRunner.class)
public class UimaDocumentProcessorTest {
    @Captor
    private ArgumentCaptor<List<Enhancement>> enhancementsCaptor;

    // DocumentProcessor ties together too many things, which made this test
    // balloon like crazy. :-( FIXME

    // We test that sentences are put into the enhancements first here. This needs the additional
    // assertion that the enhancer is going to insert enhancements from this collection in-order
    // See CasEnhancer's test
    @Test
    public void putsSentencesBeforeViewEnhancements() throws Exception {
        // given
        final UimaTestService uimaService = new UimaTestService();
        final Document document = Jsoup.parse("foo");
        final ConvenientCas cas = uimaService.provideCas(Language.ENGLISH);
        cas.setDocumentText("foo");
        final HtmlDocumentAnalyser documentAnalyser = mock(HtmlDocumentAnalyser.class);
        final CasEnhancer casEnhancer = mock(CasEnhancer.class);
        final SentenceEnhancementsGenerator sentenceGenny
                = mock(SentenceEnhancementsGenerator.class);
        final EnhancementGenerator enhancementGenny = mock(EnhancementGenerator.class);

        final UimaDocumentProcessor processor = new UimaDocumentProcessor(
                documentAnalyser,
                Providers.of(casEnhancer),
                sentenceGenny
        );

        final Activity activity = mock(Activity.class);
        when(activity.enhancementDescription()).thenReturn(mock(EnhancerSettings.class));
        when(activity.enhancementDescription().getEnhancementGenerator())
                .thenReturn(enhancementGenny);

        final ViewRequest viewRequest = ViewRequest.create(
                Language.ENGLISH,
                mock(Topic.class),
                activity,
                document,
                new URL("http://example.com")
        );

        // when
        when(documentAnalyser.analyze(viewRequest)).thenReturn(cas);
        when(enhancementGenny.enhance(cas)).thenReturn(new ArrayList<>(
                ImmutableList.of(new ViewEnhancement(0, 3))
        ));
        final SentenceAnnotation sentenceAnnotation =
                cas.createAnnotation(0, 3, SentenceAnnotation.class);
        when(sentenceGenny.enhance(cas)).thenReturn(new ArrayList<>(ImmutableList.of(
                new SentenceEnhancement(sentenceAnnotation)
        )));
        processor.process(viewRequest);
        verify(casEnhancer).enhance(
                ArgumentMatchers.eq(cas),
                any(Document.class),
                enhancementsCaptor.capture()
        );

        // then
        assertThat(
                "The sentence enhancements should be before the viewEnhancements",
                enhancementsCaptor.getValue(),
                Matchers.contains(
                        new SentenceEnhancement(sentenceAnnotation),
                        new ViewEnhancement(0, 3)
                )
        );
    }
}
