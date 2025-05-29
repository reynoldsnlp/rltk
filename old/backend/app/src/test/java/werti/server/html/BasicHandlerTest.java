package werti.server.html;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-18
 */
public class BasicHandlerTest {

}
//
//     @Rule public MockitoRule rule = MockitoJUnit.rule();
//     @Rule public ExpectedException thrown = ExpectedException.none();
//
//     @Bind @Mock private UrlFetcher urlFetcher;
//     @Bind @Mock private Processor processor;
//     @Bind @Mock private GuavaDocumentCache cache;
//     @Mock private TokenCounterParameters parameters;
//     @Inject private BasicRetriever handler;
//     @Inject @Named("fresh-cas") private Provider<ConvenientCas> casProvider;
//     @Mock private Pipeline pipeline;
//     @Mock private AnalysisEngineDescription analysisEngineDescription;
//     @Mock private Topic topic;
//
//     private Document document;
//
//     @Before
//     public void setUp() {
//         Guice.createInjector(
//                 BoundFieldModule.of(this),
//                 new UimaModule()
//         ).injectMembers(this);
//         this.document = Jsoup.parse("<p>This is a text.</p>");
//     }
//
//     @Test
//     public void testHandler() throws Exception {
//         // given
//         final Language language = Language.ENGLISH;
//         final ConvenientCas cas = casProvider.get();
//         final URL url = new URL("http://example.com");
//         cas.setDocumentText(this.document.body().html());
//
//         // when
//         when(parameters.getLanguage()).thenReturn(language);
//         when(parameters.getUrl()).thenReturn(url);
//         when(parameters.pipeline()).thenReturn(pipeline);
//         when(parameters.getTopic()).thenReturn(topic);
//         when(pipeline.assemble()).thenReturn(analysisEngineDescription);
//         when(urlFetcher.getDocumentFrom(any())).thenReturn(this.document);
//         when(processor.process(this.document, language, analysisEngineDescription))
//                 .thenReturn(cas);
//
//         final RetrievedDocument retrievedDocument =
//                 handler.handle(parameters);
//
//         // then
//         verify(cache).put(url, language, topic, retrievedDocument);
//
//         // additionally, test the caching
//         when(cache.getDocumentFor(url,language, topic))
//                 .thenReturn(Optional.of(retrievedDocument));
//
//         final RetrievedDocument cacheDocument = handler.handle(parameters);
//         assertEquals(
//                 "The second call came from cache,",
//                 retrievedDocument,
//                 cacheDocument
//         );
//    @Test
//     public void testInvalidParameters() throws Exception {
//         when(parameters.getLanguage())
//                 .thenThrow(new ViewResponseException("test"));
//
//         thrown.expect(ViewResponseException.class);
//         thrown.expect(hasProperty("status", is(HttpServletResponse.SC_BAD_REQUEST)));
//         handler.handle(parameters);
//   }

