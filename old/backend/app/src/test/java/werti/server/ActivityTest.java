package werti.server;

import com.google.inject.Inject;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.select.Elements;
import org.junit.Before;
import org.junit.Test;
import org.junit.Ignore;
import werti.Language;
import werti.server.data.Activity;
import werti.server.data.Topic;
import werti.server.data.Topics;
import werti.server.servlet.ViewParameters;
import werti.server.support.WithFrontend;

import java.net.URL;
import java.net.URLEncoder;
import java.util.Collection;
import java.util.Iterator;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.hamcrest.Matchers.is;
import static org.junit.Assert.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-28.10.16
 */
public class ActivityTest extends WithFrontend {
    private static final Logger log = LogManager.getLogger();
    private static final String baseUri = "https://en.wikipedia.org/wiki/Napoleon";

    private static final String HTML =
            "<html><head><title>Napoleon</title></head><body>" +
                    "<p><b>Napoleon Bonaparte</b> (<i>Napoléon Bonaparte</i>;" +
                    " <span class=\"nowrap\"><span class=\"IPA nopopups\">" +
                    "<a href=\"/wiki/Help:IPA_for_English\" title=\"Help:IPA for English\">" +
                    "/<span style=\"border-bottom:1px dotted\"><span title=\"'n' in 'no'\">n" +
                    "</span><span title=\"/ə/ 'a' in 'about'\">ə</span><span title=\"/ˈ/ primary " +
                    "stress follows\">ˈ</span><span title=\"'p' in 'pie'\">p</span><span title=\"/oʊ/ " +
                    "long 'o' in 'code'\">oʊ</span><span title=\"'l' in 'lie'\">l</span>" +
                    "<span title=\"/i/ 'y' in 'happy'\">i</span><span title=\"/ən/ 'on' in 'button'\">" +
                    "ən</span></span>, <span style=\"border-bottom:1px dotted\"><span title=\"/-/ affix\">" +
                    "-</span><span title=\"/ˈ/ primary stress follows\">ˈ</span><span title=\"'p' in 'pie'\">" +
                    "p</span><span title=\"/oʊ/ long 'o' in 'code'\">oʊ</span><span title=\"'l' in 'lie'\">l</span>" +
                    "<span title=\"/j/ 'y' in 'yes'\">j</span><span title=\"/ən/ 'on' in 'button'\">ən</span>" +
                    "</span>/</a></span></span>;<sup id=\"cite_ref-2\" class=\"reference\">" +
                    "<a href=\"#cite_note-2\">[2]</a></sup> <small>French:&nbsp;</small>" +
                    "<span title=\"Representation in the International Phonetic Alphabet (IPA)\" class=\"IPA\">" +
                    "<a href=\"/wiki/Help:IPA_for_French\" title=\"Help:IPA for French\">[napɔleɔ̃ bɔnapaʁt]</a></span>," +
                    " <small>Italian:&nbsp;</small><span title=\"Representation in the International Phonetic Alphabet " +
                    "(IPA)\" class=\"IPA\"><a href=\"/wiki/Help:IPA_for_Italian\" title=\"Help:IPA for Italian\">" +
                    "[napoleoŋe bɔŋaparte]</a></span>, born \"<i>Napoleone di Buonaparte</i>\" " +
                    "(<small>Italian:&nbsp;</small><span title=\"Representation in the International Phonetic " +
                    "Alphabet (IPA)\" class=\"IPA\"><a href=\"/wiki/Help:IPA_for_Italian\" title=\"Help:IPA for " +
                    "Italian\">[napoleoŋe dj buɔŋaparte]</a></span>); 15 August 1769 – 5 May 1821) was a French " +
                    "military and political leader who rose to prominence during the " +
                    "<a href=\"/wiki/French_Revolution\" title=\"French Revolution\">French Revolution</a> and " +
                    "led <a href=\"/wiki/Napoleon_Bonaparte%27s_battle_record\" class=\"mw-redirect\" " +
                    "title=\"Napoleon Bonaparte's battle record\">several successful campaigns</a> during the " +
                    "<a href=\"/wiki/French_Revolutionary_Wars\" title=\"French Revolutionary Wars\">Revolutionary " +
                    "Wars</a>. As <b>Napoleon I</b>, he was <a href=\"/wiki/Emperor_of_the_French\" " +
                    "title=\"Emperor of the French\">Emperor of the French</a> from 1804 until 1814, and again " +
                    "in 1815. Napoleon dominated European and global affairs for more than a decade while leading " +
                    "France against a series of coalitions in the <a href=\"/wiki/Napoleonic_Wars\" " +
                    "title=\"Napoleonic Wars\">Napoleonic Wars</a>. He won most of these wars and the " +
                    "vast majority of his battles, building a <a href=\"/wiki/First_French_Empire\" " +
                    "title=\"First French Empire\">large empire</a> that ruled over continental Europe " +
                    "before its final collapse in 1815. One of the greatest commanders in history, his wars " +
                    "and campaigns are studied at military schools worldwide. He also remains one of " +
                    "the most celebrated and controversial political figures in <a href=\"/wiki/History_of_the_world\"" +
                    " title=\"History of the world\">human history</a>.<sup id=\"cite_ref-Roberts.2C_Andrew_2014_3-0\"" +
                    " class=\"reference\"><a href=\"#cite_note-Roberts.2C_Andrew_2014-3\">[3]</a></sup>" +
                    "<sup id=\"cite_ref-4\" class=\"reference\"><a href=\"#cite_note-4\">[4]</a></sup></p>";

    @Inject
    Topics topics;
    private Language language;
    private Collection<Topic> topicsForLanguage;
    private Topic topic;
    private Activity activity;
    private URL remoteDummyUrl;
    private URL requestUrl;

    @Before
    public void setUp() throws Exception {
        injector.injectMembers(this);

        language = Language.ENGLISH;
        topicsForLanguage = topics.getTopicsFor(language);

        // we skip the first topic, and get the second one
        final Iterator<Topic> topicIterator = topicsForLanguage.iterator();
        topicIterator.next();
        topic = topicIterator.next();

        // the same for activities
        final Iterator<Activity> activityIterator = topic.activities().iterator();
        activityIterator.next();
        activityIterator.next();
        activity = activityIterator.next();
        remoteDummyUrl = new URL("http://example.com");
        requestUrl = makeRequestUrlString(topic, activity, language, remoteDummyUrl);
    }

    private URL makeRequestUrlString(
            final Topic topic,
            final Activity activity,
            final Language language,
            final URL url
    ) throws Exception {
        return new URL(
                jettyBaseUrl +
                "/view" + "?lang=" + language.toString() +
                          "&topic=" + topic.topic() +
                          "&activity=" + activity.activity() +
                          "&url=" + URLEncoder.encode(url.toString(), "UTF-8")
        );
    }

    private Collection<String> getRelativeLinks (final Document document) {
        final Elements anchors = document.select("a[href]");
        final Elements media = document.select("[src]");
        final Elements links = document.select("link[href]");
        return Stream.of(
                anchors.stream().map(link -> link.attr("href")),
                media.stream().map(medium -> medium.attr("src")),
                links.stream().map(link -> link.attr("href"))
        ).flatMap(x -> x).collect(Collectors.toList());
    }

    @Ignore @Test
    public void testActivity() throws Exception {
        final Document document = Jsoup.parse(HTML, baseUri);
        final Collection<String> relativeLinks = getRelativeLinks(document);

        when(urlFetcher.getDocument(any(ViewParameters.class))).thenReturn(document);
        landingPage.goTo();
        landingPage.fillInUrl(remoteDummyUrl);
        landingPage.selectLanguage(language);
        landingPage.selectTopic(topic);
        landingPage.engageActivity(language, topic, activity);
        verify(urlFetcher).getDocument(any(ViewParameters.class));
        assertThat(
                "We should be at the correct /view url",
                landingPage.currentUrl(),
                is(requestUrl)
        );
        activityPage.assertEnhancementsArePresent(topic);
        activityPage.assertFrontendResourcesAreLoaded(activity);
        activityPage.assertLinksAreAbsolute(relativeLinks);
    }
}
