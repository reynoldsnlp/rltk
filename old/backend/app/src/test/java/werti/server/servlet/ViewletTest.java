package werti.server.servlet;

import com.google.common.collect.ImmutableMap;
import com.google.inject.Guice;
import com.google.inject.Inject;
import com.google.inject.Provider;
import com.google.inject.name.Named;
import com.google.inject.testing.fieldbinder.Bind;
import com.google.inject.testing.fieldbinder.BoundFieldModule;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.Before;
import org.junit.Ignore;
import org.junit.Rule;
import org.junit.Test;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnit;
import org.mockito.junit.MockitoRule;
import werti.Language;
import werti.server.data.Activity;
import werti.server.data.Topic;
import werti.server.data.Topics;
import werti.server.modules.UimaModule;
import werti.server.views.DocumentInfo;
import werti.uima.ConvenientCas;

import java.util.Map;
import java.util.Optional;

import static org.junit.Assert.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-14.10.16
 */
public class ViewletTest extends ServletTestBase {
    // File comes from cache
    // File is retrieved from scratch

    @Rule public MockitoRule rule = MockitoJUnit.rule();
    @Mock private DocumentInfo documentInfo;

    @Bind @Mock
    Topics topics;
    @Inject private Viewlet viewlet;
    @Mock
    Topic topic;

    @Inject @Named("fresh-cas") private Provider<ConvenientCas> casProvider;

    @Mock private Activity activity;
    private Document htmlDocument;


    private final Map<String, String[]> validParameters = ImmutableMap.of(
            "url", new String[] { "http://example.com" },
            "lang", new String[] { "en" },
            "activity", new String[] { "click" },
            "topic", new String [] { "articles" }
    );

    @Before
    public void setUp() throws Exception {
        Guice.createInjector(
                BoundFieldModule.of(this),
                new UimaModule()
        ).injectMembers(this);
        when(topics.get("articles", Language.ENGLISH)).thenReturn(Optional.of(topic));
        when(topic.selectActivity("click")).thenReturn(Optional.of(activity));

        this.htmlDocument = Jsoup.parse("<p>This is a test</p>");
    }

    @Ignore @Test // see #124
    public void doGetValidResponse() throws Exception {
        // given
        final ConvenientCas cas = casProvider.get();
        when(request.getParameterMap()).thenReturn(validParameters);

        // when
        viewlet.doGet(request, response);

        // then
        verify(responseWriter).write(this.responseCaptor.capture());
        assertEquals(
                "The document returned by the enhancer is the content of the response.",
                htmlDocument.outerHtml(),
                responseCaptor.getValue()
        );
    }
}
