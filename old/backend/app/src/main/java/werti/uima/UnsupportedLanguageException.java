package werti.uima;

/**
 * @author Aleksandar Dimitrov
 * @since 2018-02-10
 */
public class UnsupportedLanguageException extends Exception {
    public UnsupportedLanguageException(String languageCode) {
        super("Language code not supported: " + languageCode);
    }
}
