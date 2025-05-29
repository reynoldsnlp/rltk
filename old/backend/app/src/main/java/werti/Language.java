package werti;

import java.util.Locale;
import java.util.Optional;

/**
 * Represents a language VIEW knows about.
 *
 * @author Aleksandar Dimitrov
 * @since  2016-09-10
 */
public enum Language {
    ENGLISH,
    GERMAN,
    RUSSIAN,
    SPANISH,
    ESTONIAN;

    /**
     * @return ISO 639 codes. Please use ISO 639-1 wherever possible,
     * and 639-2 T everywhere else.
     */
    @Override
    public String toString() {
        switch (this) {
            case ENGLISH: return "en";
            case GERMAN:  return "de";
            case RUSSIAN: return "ru";
            case SPANISH: return "es";
            case ESTONIAN: return "et";
            default: return super.toString();
        }
    }

    public String humanLabel() {
        switch (this) {
            case ENGLISH: return "English";
            case GERMAN:  return "Deutsch";
            case RUSSIAN: return "Русский";
            case SPANISH: return "Español";
            case ESTONIAN: return "Eesti";
            default: return "Ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl fhtagn";
        }
    }

    /**
     * Generate {@link Language} value from ISO 639-1 language code.
     * @param input Language code
     * @return The language, or {@link Optional#empty()} if the language code
     *         could not be recognized as a known language.
     */
    public static Optional<Language> fromIsoCode(final String input) {
        switch (input) {
            case "en": return Optional.of(Language.ENGLISH);
            case "de": return Optional.of(Language.GERMAN);
            case "ru": return Optional.of(Language.RUSSIAN);
            case "es": return Optional.of(Language.SPANISH);
            case "et": return Optional.of(Language.ESTONIAN);
            default: return Optional.empty();
        }
    }

    public Locale getLocale() {
        final Locale.Builder locale = new Locale.Builder();
        locale.setLanguage(this.toString());

        if (this == RUSSIAN) {
            locale.setScript("Cyrl");
        }

        return locale.build();
    }
}
