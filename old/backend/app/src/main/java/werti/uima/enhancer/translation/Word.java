
package werti.uima.enhancer.translation;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.apache.commons.lang.builder.ToStringBuilder;

public class Word {

    private String word;
    private String lang;
    private List<Sense> senses = null;
    private List<String> categories = null;
    private String pos;
    private List<Head> heads = null;
    private List<Conjugation> conjugation = null;
    private Map<String, Object> additionalProperties = new HashMap<String, Object>();

    /**
     * No args constructor for use in serialization
     * 
     */
    public Word() {
    }

    /**
     * 
     * @param conjugation
     * @param heads
     * @param categories
     * @param word
     * @param lang
     * @param senses
     * @param pos
     */
    public Word(String word, String lang, List<Sense> senses, List<String> categories, String pos, List<Head> heads, List<Conjugation> conjugation) {
        super();
        this.word = word;
        this.lang = lang;
        this.senses = senses;
        this.categories = categories;
        this.pos = pos;
        this.heads = heads;
        this.conjugation = conjugation;
    }

    public String getWord() {
        return word;
    }

    public void setWord(String word) {
        this.word = word;
    }

    public String getLang() {
        return lang;
    }

    public void setLang(String lang) {
        this.lang = lang;
    }

    public List<Sense> getSenses() {
        return senses;
    }

    public void setSenses(List<Sense> senses) {
        this.senses = senses;
    }

    public List<String> getCategories() {
        return categories;
    }

    public void setCategories(List<String> categories) {
        this.categories = categories;
    }

    public String getPos() {
        return pos;
    }

    public void setPos(String pos) {
        this.pos = pos;
    }

    public List<Head> getHeads() {
        return heads;
    }

    public void setHeads(List<Head> heads) {
        this.heads = heads;
    }

    public List<Conjugation> getConjugation() {
        return conjugation;
    }

    public void setConjugation(List<Conjugation> conjugation) {
        this.conjugation = conjugation;
    }

    public Map<String, Object> getAdditionalProperties() {
        return this.additionalProperties;
    }

    public void setAdditionalProperty(String name, Object value) {
        this.additionalProperties.put(name, value);
    }

    @Override
    public String toString() {
        return new ToStringBuilder(this).append("word", word).append("lang", lang).append("senses", senses).append("categories", categories).append("pos", pos).append("heads", heads).append("conjugation", conjugation).append("additionalProperties", additionalProperties).toString();
    }

}
