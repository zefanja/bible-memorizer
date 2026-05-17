# Bible Memorizer Configuration

**enable_fix_old_notes**: Set to `true` to enable the "Fix old notes" tool in the Tools menu. *(Default: false)*

## Recite Chapter

**recite_initial_visible**: Number of verses visible when the Recite dialog opens. *(Default: 2)*

**recite_reveal_step**: Number of verses revealed with `Space` / `→`. *(Default: 2)*

**recite_big_step**: Number of verses revealed with `Shift+Space` / `Shift+→`. *(Default: 5)*

**recite_young_threshold_days**: If the interval of the `last_letters` card is below this value (or the card is new/learning/relearning), the verse starts at stage **last_letters**. *(Default: 1)*

**recite_mature_threshold_days**: At or above this interval the verse starts at stage **verse number only**. Between `young` and `mature` threshold → **first_letters**. *(Default: 21)*

*(Changes require a restart of Anki)*
