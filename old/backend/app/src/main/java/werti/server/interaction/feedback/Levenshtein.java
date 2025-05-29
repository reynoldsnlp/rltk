package werti.server.interaction.feedback;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class Levenshtein {

    private static final String LEFT_EDGE = "L";
    private static final String TOP_EDGE = "T";

    private static final String EQUAL_LETTER = "E";
    private static final String SUBSTITUTION_LETTER = "S";
    private static final String INSERTION_LETTER = "I";
    private static final String DELETION_LETTER = "D";

    private int editDistance;

    private static final Pattern correctionPattern = Pattern.compile("[" +
            SUBSTITUTION_LETTER + INSERTION_LETTER + DELETION_LETTER +
            "]");

    public Levenshtein() {
        this.editDistance = 0;
    }


    public int getEditDistance() {
        return editDistance;
    }


    @Override
    public String toString() {
        return "Levenshtein [editDistance=" + editDistance + "]";
    }

    /**
     * Construct the levenshtein matrix.
     *
     * @param submission the submission of the student.
     * @param correctAnswer the correct answer.
     *
     * @return the levenshtein matrix.
     */
    public String[][] createLevMatrix(String submission, String correctAnswer) {
        String[][] levMatrix = new String[submission.length() + 1][correctAnswer.length() + 1];

        String leftEdge = LEFT_EDGE.toLowerCase();
        String topEdge = TOP_EDGE.toLowerCase();

        String equalLetter = EQUAL_LETTER.toLowerCase();
        String substitutionLetter = SUBSTITUTION_LETTER.toLowerCase();
        String deletionLetter = DELETION_LETTER.toLowerCase();
        String insertionLetter = INSERTION_LETTER.toLowerCase();

        // increment along the first column of each row
        for (int row = 0; row <= submission.length(); row++) {
            levMatrix[row][0] = row + leftEdge;
        }

        // increment each column in the first row
        for (int column = 0; column <= correctAnswer.length(); column++) {
            levMatrix[0][column] = column + topEdge;
        }

        // Fill in the rest of the matrix
        for (int row = 1; row <= submission.length(); row++) {
            for (int column = 1; column <= correctAnswer.length(); column++) {
                // store the cell entries from left, above and above left
                String cellLeft = levMatrix[row][column - 1];
                String cellAbove = levMatrix[row - 1][column];
                String cellAboveLeft = levMatrix[row - 1][column - 1];

                // store the numbers of the cell entries from left, above and above left
                int numLeft = Integer.parseInt(cellLeft.substring(0, cellLeft.length() - 1));
                int numAbove = Integer.parseInt(cellAbove.substring(0, cellAbove.length() - 1));
                int numAboveLeft = Integer.parseInt(cellAboveLeft.substring(0, cellAboveLeft.length() - 1));

                // if the character of the student's answer is equal to
                // the one of the correct answer, assign the cell entry directly
                if (submission.charAt(row - 1) == correctAnswer.charAt(column - 1)) {
                    levMatrix[row][column] = numAboveLeft + equalLetter;
                }
                // otherwise compute the minimum of the remaining options and
                // assign the smallest number to the cell entry
                // note: +1 because edit cost increases by 1
                else {
                    int minimum = Math.min(Math.min(
                            numAboveLeft + 1, // substitution
                            numLeft + 1), // insertion
                            numAbove + 1); // deletion
                    if (minimum == numAboveLeft + 1) {
                        levMatrix[row][column] = minimum + substitutionLetter;
                    } else if (minimum == numAbove + 1) {
                        levMatrix[row][column] = minimum + deletionLetter;
                    } else if (minimum == numLeft + 1) {
                        levMatrix[row][column] = minimum + insertionLetter;
                    }
                }
            }
        }

        // last cell of the lev matrix (bottom right)
        String lastCell = levMatrix[submission.length()][correctAnswer.length()];

        // store the edit distance
        editDistance = Integer.parseInt(lastCell.substring(0, lastCell.length() - 1));

        return levMatrix;
    }

    /**
     * Give the student a hint to the correct answer.
     *
     * @param submission  The submission of the student.
     * @param levMatrix The levenshtein matrix.
     *
     * @return the hint to the correct answer.
     */
    public String createHintAnswer(String submission, String[][] levMatrix) {

        simplestPath(levMatrix);

        final String spanStart = "<span name=\"";
        final String spanEnd = "</span>";

        StringBuilder hintAnswerBuilder = new StringBuilder();

        for (int row = 1; row < levMatrix.length; row++) {
            for (int column = 1; column < levMatrix[row].length; column++) {
                String cell = levMatrix[row][column];
                // only consider cells with upper case letter at the end
                if (Character.isUpperCase(cell.charAt(cell.length() - 1))) {
                    String submissionChar = Character.toString(submission.charAt(row - 1));
                    // do nothing, the given character was correct
                    if (cell.endsWith(EQUAL_LETTER)) {
                        hintAnswerBuilder.append(submissionChar);
                    }
                    // substitute the submission character with the correct character
                    // the submission character is marked blue
                    else if (cell.endsWith(SUBSTITUTION_LETTER)) {
                        hintAnswerBuilder
                                .append(spanStart)
                                .append(SUBSTITUTION_LETTER)
                                .append("\" class=\"hint-answer-style-substitution\">")
                                .append(submissionChar)
                                .append(spanEnd);
                    }
                    // insert the correct character
                    // the place of the correct character is marked with "_"
                    else if (cell.endsWith(INSERTION_LETTER)) {
                        hintAnswerBuilder
                                .append(spanStart)
                                .append(INSERTION_LETTER)
                                .append("\" class=\"hint-answer-style-insertion\">")
                                .append("_")
                                .append(spanEnd);
                    }
                    // delete the superfluous character
                    // the character to delete is marked red
                    else if (cell.endsWith(DELETION_LETTER)) {
                        hintAnswerBuilder
                                .append(spanStart)
                                .append(DELETION_LETTER)
                                .append("\" class=\"hint-answer-style-deletion\">")
                                .append(submissionChar)
                                .append(spanEnd);
                    }
                }
            }
        }
        return hintAnswerBuilder.toString();
    }

    /**
     * Create the simplest path of changes in the table.
     *
     * @param levMatrix The table with the results and changes of the computing.
     */
    private void simplestPath(String[][] levMatrix) {

        // start at the the last cell (bottom right) to compute the simplest path
        for (int row = levMatrix.length - 1; row >= 0; row--) {
            for (int column = levMatrix[row].length - 1; column >= 0; column--) {
                // cells of interest become capitalized in the levenshtein matrix
                String currentCell = levMatrix[row][column].toUpperCase();

                // the first cell and last path entry
                // assign the current cell and move to the cell to the left
                if (("0" + TOP_EDGE).equals(currentCell)
                        || currentCell.endsWith(INSERTION_LETTER)) {
                    levMatrix[row][column] = currentCell;
                }
                // if the path enters the left edge, it means that the student's answer contains
                // redundant character(s) at the begin of the answer, thats why the cell right to
                // this cell becomes the instruction "D" to delete this character
                // move to the cell above
                else if (currentCell.endsWith(LEFT_EDGE)) {
                    levMatrix[row][column + 1] =
                            levMatrix[row][column + 1]
                                    .toUpperCase()
                                    .replace(EQUAL_LETTER, DELETION_LETTER)
                                    .replace(SUBSTITUTION_LETTER, DELETION_LETTER)
                                    .replace(INSERTION_LETTER, DELETION_LETTER);
                    row--;
                    column++; // since the column will decrease by 1
                }
                // if the path enters the top edge, it means that the student's answer is missing
                // character(s) at the begin of the answer, thats why the cell below this cell
                // becomes the instruction "I" to insert the missing character
                // move to the cell to the left
                else if (currentCell.endsWith(TOP_EDGE)) {
                    levMatrix[row + 1][column] =
                            levMatrix[row + 1][column]
                                    .toUpperCase()
                                    .replace(EQUAL_LETTER, INSERTION_LETTER)
                                    .replace(SUBSTITUTION_LETTER, INSERTION_LETTER)
                                    .replace(DELETION_LETTER, INSERTION_LETTER);
                }
                // assign the current cell and move to the cell above left
                else if (currentCell.endsWith(EQUAL_LETTER) ||
                        currentCell.endsWith(SUBSTITUTION_LETTER)) {
                    levMatrix[row][column] = currentCell;
                    row--;
                }
                // assign the current cell and move to the cell above
                else if (currentCell.endsWith(DELETION_LETTER)) {
                    levMatrix[row][column] = currentCell;
                    row--;
                    column++; // since column will decrease by 1
                }
            }
        }
    }

    /**
     * Get the first hint from the hint answer.
     *
     * @param hintAnswer the required hint answer
     * @return the first hint from the hint answer
     */
    public String getFirstHint(final String hintAnswer){
        String firstHint = "";
        Matcher correctionMatcher = correctionPattern.matcher(hintAnswer);
        if(correctionMatcher.find()){
            firstHint = correctionMatcher.group();
        }
        switch(firstHint) {
            case SUBSTITUTION_LETTER:
                return "substitute";
            case INSERTION_LETTER:
                return "insert";
            case DELETION_LETTER:
                return "delete";
            default:
                return "";
        }
    }

    /**
     * Create a list of the correction indexes.
     * Note that in case of "insert" a position like e.g. 1
     * would mean that a letter would be inserted between
     * the indexes 0 and 1.
     *
     * @param levMatrix The levenshtein matrix.
     *
     * @return the list with each correction position.
     */
    public List<Integer> createCorrectionIndexList(String[][] levMatrix) {

        simplestPath(levMatrix);

        List<Integer> correctionIndexList = new ArrayList<>();

        for (int row = 1; row < levMatrix.length; row++) {
            for(int column = 1; column < levMatrix[row].length; column++) {
                String cell = levMatrix[row][column];
                // only consider cells with upper case letter at the end
                if(Character.isUpperCase(cell.charAt(cell.length() - 1))){
                    if(cell.endsWith(SUBSTITUTION_LETTER) ||
                            cell.endsWith(DELETION_LETTER)){
                        correctionIndexList.add(row - 1);
                    }
                    else if(cell.endsWith(INSERTION_LETTER)){
                        correctionIndexList.add(column - 1);
                    }
                }
            }
        }
        return correctionIndexList;
    }
}
