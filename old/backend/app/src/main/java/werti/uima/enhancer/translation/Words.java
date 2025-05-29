package werti.uima.enhancer.translation;

import java.util.List;

import org.apache.commons.lang.builder.ToStringBuilder;

public class Words {
    private List<Word> words;

    public Words(List<Word> words) {
        this.words = words;
    }

    public List<Word> getWords() {
        return words;
    }

    public void setWords(List<Word> words) {
        this.words = words;
    }

    @java.lang.Override
    public java.lang.String toString() {
        return new ToStringBuilder(this).append("words", words).toString();
    }
}