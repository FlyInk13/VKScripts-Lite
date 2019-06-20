import BlankTheme from 'console-feed/lib/Component/theme/default'

const blankTheme = BlankTheme({});

blankTheme['LOG_COLOR'] = 'var(--text_primary)';

blankTheme['BASE_BACKGROUND_COLOR'] = 'transparent';

blankTheme['LOG_ERROR_BACKGROUND'] = '#fff0f0';
blankTheme['LOG_ERROR_BORDER'] = '#ffd6d7';

blankTheme['LOG_WARN_BACKGROUND'] = '#fefbe6';
blankTheme['LOG_WARN_BORDER'] = '#fff5c4';

blankTheme['TREENODE_FONT_SIZE'] = '13px';
blankTheme['BASE_FONT_SIZE'] = '13px';

export default blankTheme;
