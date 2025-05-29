package werti.server.views;

import werti.Language;

import java.util.List;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-25
 */
public interface View {
    List<Language> getSupportedLanguages();
    FirebaseApiData getFirebaseApiData();
}
