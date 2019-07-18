import React from 'react';
import {
  ActionSheet,
  ActionSheetItem,
  HeaderButton,
  HorizontalScroll,
  Input,
  Panel,
  Tabs,
  TabsItem,
  View,
  Alert,
  Textarea,
} from '@vkontakte/vkui';
import '@vkontakte/vkui/dist/vkui.css';
import connect from '@vkontakte/vkui-connect';
import connectPromise from '@vkontakte/vkui-connect-promise';

// Icons
import Icon16Cancel from '@vkontakte/icons/dist/16/cancel';
import Icon16Add from '@vkontakte/icons/dist/16/add';
import Icon24Settings from '@vkontakte/icons/dist/24/settings';
import Icon24Unpin from '@vkontakte/icons/dist/24/unpin';

// Elements
import {
  PanelHeaderFull, PromiseAPI,
  SetWebTheme, getArgs,
  ScrollArea, ls,
} from 'vkappsutils/dist';

// Ace
import AceEditor from 'react-ace';
import 'brace/mode/javascript';
import 'brace/theme/chrome';
import 'brace/theme/tomorrow_night';
import 'brace/ext/language_tools';

// Terminal
import {Console, Decode, Hook} from 'console-feed';
import ConsoleStyles from './TerminalTheme';

// Crypt
import AES from 'crypto-js/aes';
import UTF8 from 'crypto-js/enc-utf8';

// App
import './App.css';
import examples from './examples.js';
import codeBuilder from './utils/codeBuilder.js';
import beautify from './utils/beautify.js';
import debugApp from './utils/debugApp.js';

const TabTypeConsole = 'Console';
const TabTypeFrame = 'Frame';
const TabNameConsole = 'Console';
const noop = () => 0;

SetWebTheme();

class App extends React.Component {
  constructor(props) {
    super(props);

    this.console = {};
    this.api = new PromiseAPI();
    this.api.view = this;
    this.state = {
      hash: decodeURIComponent(window.location.hash.substr(1)),
      dark: false,
      activePanel: 'home',
      group_id: undefined,
      editorType: (window.isWeb ? 'ace' : 'textarea'),
      activeTab: false, // componentDidMount
      frameId: 0,
      authData: { },
      value: ls.value || examples.userAuth,
      logs: [
        {
          method: "info",
          data: [examples.consoleText]
        }
      ],
      tabs: []
    };

    connect.subscribe((event) => {
      switch(event.detail.type) {
        case undefined:
        case 'VKWebAppInitResult':
        case 'VKWebAppGetUserInfoResult':
        case 'VKWebAppCallAPIMethodResult':
          break;
        case 'VKWebAppUpdateConfig':
          let dark = false;
          if (/dark|gray/.test(event.detail.data.scheme)) {
            dark = true;
          }
          this.setState({ dark });
          break;
        case 'VKWebAppAccessTokenReceived':
        case 'VKWebAppCommunityAccessTokenReceived':
          const token = event.detail.data.access_token;

          this.api.access_token = token;
          if (!this.onApiReady()) {
            this.alert(noop, (
              <div>
                <b>Получен новый токен:</b>
                <ScrollArea selector='input'>
                  <Input defaultValue={token}/>
                </ScrollArea>
              </div>
            ));
          }
          break;
        default:
          console.log('new message', event.detail.type, event.detail.data);
      }
    });

    this.opts = {
      scope: '',
      app_id: 6979558
    };

    connect.send('VKWebAppGetUserInfo', {});
    connect.send('VKWebAppGetAuthToken', this.opts);
  }

  static codeGetData(name) {
    let global = 1;
    let key = name;
    let password;

    if (name[0] === '.') {
      key = name.substr(1);
      global = 0;
    }

    if (/:/.test(name)) {
      [key, ...password] = name.split(':');
      password = password.join(':');
    }

    return { name, key, global, password };
  }

  codeLoad(key) {
    if (!key) return;

    if (examples[key]) {
      const value = examples[key];
      this.editorGet().value = value;
      this.setState({ value });
      return;
    }

    const data = App.codeGetData(key);
    return this.api.callMethod('storage.get', {
      ...data
    }).then((value) => {
      if (data.password) {
        value = AES.decrypt(value, data.password).toString(UTF8);
      }

      this.setState({ value });
      this.editorGet().value = value;
    }).catch((e) => {
      this.showError(e);
    });
  }

  codeSave(key, value) {
    const data = App.codeGetData(key);

    if (data.password) {
      value = AES.encrypt(value, data.password).toString();
    }

    if (!this.codeCheckLength(value)) {
      return;
    }

    return this.api.callMethod('storage.set', {
      value, ...data
    }).then((res) => {
      if (!res) throw { error: res };
      return key;
    })
  }

  codeCheckLength(code) {
    if (code.length > 4000) {
      this.alert(noop, 'Упс, слишком большой скрипт, попробуйте сократить');
      return false;
    }
    return true;
  }

  codeBeautify() {
    const code = this.state.value;
    beautify(code).then((newCode) => {
      this.setState({
        value: newCode
      });
    });
  }

  codeSaveWindow() {
    const code = this.state.value;
    if (!this.codeCheckLength(code)) {
      return;
    }

    this.prompt((name) => {
      if (!name) return;

      this.codeSave(name, this.state.value).then(() => {
        this.alert(noop, (
          <div>
            <b>Скрипт успешно сохранен</b>
            <ScrollArea selector='input'>
              <Input defaultValue={'https://vk.com/app6979558#' + name}/>
            </ScrollArea>
          </div>
        ));
      }).catch((e) => {
        this.showError(e);
      });
    },
      <span style={{ whiteSpace: 'pre-line' }}>
        {examples.saveText}
      </span>
    );
  }

  codeView() {
    this.alert(noop, (
      <ScrollArea selector='textarea'>
        <Textarea value={codeBuilder(this.state.value)}/>
      </ScrollArea>
    ));
  }


  showError(e) {
    this.alert(noop, (
      <ScrollArea selector='textarea'>
        <Textarea defaultValue={'Произошла ошибка:\n' + JSON.stringify(e, null, 3)}/>
      </ScrollArea>
    ));
  }

  codeCreateFrame(tab) {
    const iframe = tab.item;
    const frameWindow = iframe.contentWindow;
    const frameConsole = frameWindow.console;
    const frameFunction = frameWindow.Function;
    const accessToken = this.state.token;
    let codeFunction;
    let frameCode;

    Hook(frameConsole, (log) => {
      this.setState((state) => {
        const decoded = Decode(log);
        const logs = [...state.logs];
        logs.push(decoded);
        return {logs};
      });
    });

    try {
      frameCode = codeBuilder(this.state.value);
      codeFunction = new frameFunction('console', 'windowData', frameCode).bind(frameWindow);
    } catch (e) {
      frameConsole.error(e);
      return false;
    }

    const codeEval = codeFunction.bind(
      frameWindow,
      frameConsole,
      {
        connect,
        accessToken,
        auth: (scope, group_id) => this.auth(scope, group_id),
        prompt: (message, inputValue) => new Promise((resolve) => this.prompt(resolve, message.toString(), inputValue)),
        alert: (message) => new Promise((resolve) => {
          this.alert(resolve, (
            <ScrollArea selector='textarea'>
              <Textarea defaultValue={message ? message.toString() : message}/>
            </ScrollArea>
          ))
        }),
        Args: getArgs(),
        connectRequest: (event, data) => connectPromise.send(event, data),
        close: (res) => {
          setTimeout(() => this.tabClose(tab), 10);
          return res;
        },
      }
    );

    try {
      codeEval();
    } catch (e) {
      frameConsole.error(e);
      return false;
    }

    return true;
  }

  codeStartScript() {
    const iframe = document.createElement('iframe');
    const frameId = this.state.frameId + 1;
    const tabName = 'Tab' + frameId;
    const tabs = this.state.tabs;
    const newTab = {
      type: TabTypeFrame,
      name: tabName,
      item: iframe
    };

    iframe.src = './iframe.html?1#' + tabName;
    iframe.style.display = 'none';
    this.refs.tabsContent.appendChild(iframe);
    tabs.push(newTab);
    this.setState({tabs, frameId});
    if (/document/.test(this.state.value)) {
      this.tabSwitch(newTab);
    }

    iframe.onload = () => {
      const response = this.codeCreateFrame(newTab);

      if (!response) {
        this.tabClose(newTab);
      }
    };
  }

  codeOnUpdate(newValue) {
    ls.value = newValue;
    this.setState({
      value: newValue
    });
  }


  editorGet() {
    if (this.state.editorType === 'ace') {
      return document.getElementById('ace_editor');

    }

    return this.refs.editorTextarea;
  }

  editorToggle() {
    const editorType = this.state.editorType === 'ace' ? 'textarea' : 'ace';

    this.setState({editorType});
    setTimeout(() => this.onResize(), 100);
  }

  tabFullscreenExit() {
    const activeTab = this.state.activeTab;

    activeTab.item.classList.remove('fullScreenTab');
    this.refs.splitContentWrap.classList.remove('needFullScreenTab');
    this.setState({
      lastClick: null,
      tabFullScreen: false
    });
    this.onResize();
  }

  tabFullscreen(newTab) {
    const activeTab = this.state.activeTab;
    const lastClick = this.state.lastClick;
    const ping = Date.now() - lastClick;

    if (activeTab === newTab && ping < 400) {
      newTab.item.classList.toggle('fullScreenTab');
      this.refs.splitContentWrap.classList.toggle('needFullScreenTab');
      this.setState({
        lastClick: null,
        tabFullScreen: true
      });
      this.onResize();
      return;
    }

    this.setState({lastClick: Date.now()});
  }

  tabSwitch(newTab) {
    if (this.tabFullscreen(newTab)) {
      return;
    }

    const activeTab = this.state.activeTab;

    activeTab.item.style.display = 'none';
    newTab.item.style.display = 'block';

    this.setState({
      activeTab: newTab
    });
  }

  tabClose(tab, event) {
    if (tab.name === TabNameConsole) {
      this.setState({logs: []});
      return;
    }

    const tabs = this.state.tabs;

    const tabIndex = tabs.findIndex((tabItem) => tabItem === tab);

    tabs.splice(tabIndex, 1);
    tab.item.outerHTML = '';

    const tabNext = tabs[tabIndex] || tabs[tabIndex - 1] || tabs[0];

    this.tabSwitch(tabNext);
    this.setState({tabs});

    if (!event) return;
    event.cancelBubble = true;
    event.stopPropagation();
    return false;
  }


  onResize() {
    const editor = this.editorGet();
    const editorWrap = this.refs.editorWrap;
    const tabsContent = this.refs.tabsContent;
    const tabsWrapper = tabsContent.parentNode;
    const padding = 0;
    if (!editorWrap) return;

    editor.style.width = editorWrap.clientWidth + 'px';
    editor.style.height = editorWrap.clientHeight - padding + 'px';
    this.setState({
      editorWidth: String(editorWrap.clientWidth + ''),
      editorHeight: String(editorWrap.clientHeight - padding),
    });

    tabsContent.style.height = tabsWrapper.clientHeight - tabsWrapper.firstChild.clientHeight + 'px';
  }

  onApiReady() {
    if (this.state.apiReady) {
      return false;
    }

    const authData = this.state.authData;
    authData['-0'] =  this.api.access_token;
    this.setState({ apiReady: true, authData });

    this.codeLoad(this.state.hash);
    return true;
  }

  componentDidMount() {
    window.addEventListener('resize', () => this.onResize());
    this.onResize();

    const firstTab = {
      type: TabTypeConsole,
      name: TabNameConsole,
      item: this.refs.consoleOutput
    };

    this.setState({
      activeTab: firstTab,
      tabs: [firstTab]
    });
  }

  auth(scope, group_id) {
    group_id = group_id || 0;
    const authKey = [scope, group_id].join('-');
    return Promise.resolve().then(() => {
      if (this.state.authData[authKey]) {
        const access_token = this.state.authData[authKey];
        return { data: { access_token }};
      }

      const opts = { ...this.opts, scope };
      let method = 'VKWebAppGetAuthToken';

      if (group_id) {
        opts.group_id = group_id;
        method = 'VKWebAppGetCommunityAuthToken';
      }

      return connectPromise.send(method, opts);
    }).then((data) => {
      const token = data.data.access_token;
      const authData = this.state.authData;
      authData[authKey] = token;
      this.setState({ authData });
      return token;
    })
  }

  promptSubmit(value) {
    this.state.promptCallback(value);
    this.setState({
      popout: null,
      promptValue: null,
      promptCallback: null,
    });
  }

  prompt(callback, title, value) {
    value = value || '';

    this.setState({
      promptValue: value,
      promptCallback: callback,
      popout: (
        <Alert
          actionsLayout="vertical"
          actions={[{
            title: 'Отмена',
            style: 'cancel',
            autoclose: true,
          }, {
            title: 'Ок',
            action: () => this.promptSubmit(this.state.promptValue)
          }]}
          onClose={() => this.promptSubmit(null)}
        >
          <h2>Подтвердите действие</h2>
          <p>{title}</p>
          <ScrollArea selector='input'>
            <Input defaultValue={value} onChange={(event) => this.setState({promptValue: event.target.value})}/>
          </ScrollArea>
        </Alert>
      )
    });
  }

  alert(callback, data) {
    this.setState({
      popout: (
        <Alert
          actionsLayout="vertical"
          actions={[{
            title: 'OK',
            autoclose: true,
          }]}
          onClose={() => {
            this.setState({popout: null});
            callback();
          }}
        >
          <h2>Подтвердите действие</h2>
          <div className="alertContentWarp">
              {data}
          </div>
        </Alert>
      )
    });
  }

  showExamples() {
    this.setState({
      popout:
        <ActionSheet
          onClose={() => this.setState({popout: null})}
          title="Настройки"
        >
          <ActionSheetItem autoclose onClick={() => this.codeLoad('sendKeyboard')}>Отправка клавиатуры, vk connect, close</ActionSheetItem>
          <ActionSheetItem autoclose onClick={() => this.codeLoad('userAuth')}>Авторизация пользователя</ActionSheetItem>
          <ActionSheetItem autoclose onClick={() => this.codeLoad('groupAuth')}>Авторизация группы</ActionSheetItem>
          <ActionSheetItem autoclose theme="destructive">Закрыть</ActionSheetItem>
        </ActionSheet>
    });
  }

  openDebugSettings() {
    this.setState({
      popout:
        <ActionSheet
          onClose={() => this.setState({popout: null})}
          title="Настройки"
        >
          <ActionSheetItem autoclose onClick={() => debugApp()}>Загрузить консоль</ActionSheetItem>
          <ActionSheetItem autoclose onClick={() => this.codeView()}>Посмотреть код</ActionSheetItem>
          <ActionSheetItem autoclose onClick={() => this.auth().catch(() => 0)}>Сменить токен</ActionSheetItem>
          <ActionSheetItem autoclose theme="destructive">Закрыть</ActionSheetItem>
        </ActionSheet>
    });
  }

  openSettings() {
    this.setState({
      popout:
        <ActionSheet
          onClose={() => this.setState({popout: null})}
          title="Настройки"
        >
          <ActionSheetItem theme="destructive" autoclose onClick={() => this.openDebugSettings()}>Debug меню</ActionSheetItem>
          <ActionSheetItem autoclose onClick={() => this.showExamples()}>Примеры скриптов</ActionSheetItem>
          <ActionSheetItem autoclose onClick={() => this.codeSaveWindow()}>Сохранить скрипт</ActionSheetItem>
          <ActionSheetItem autoclose onClick={() => this.codeBeautify()}>Сделать красиво</ActionSheetItem>
          <ActionSheetItem autoclose onClick={() => this.editorToggle()}>Сменить редактор</ActionSheetItem>
          <ActionSheetItem autoclose theme="destructive">Закрыть</ActionSheetItem>
        </ActionSheet>
    });
  }

  getTitle() {
    if (this.state.tabFullScreen ) {
      return this.state.activeTab.name;
    }

    if (this.state.hash) {
      return this.state.hash;
    }

     return 'VKScripts Lite';
  }

  render() {
    return (
      <View activePanel="tabs" popout={this.state.popout}>
        <Panel id="tabs" className="panelWrapper">
          <PanelHeaderFull
            isWeb={window.isWeb}
            ref="header"
            left={this.state.tabFullScreen ? (
              <HeaderButton
                onClick={() => this.tabFullscreenExit()}
                key="toggle_tabState"
              >
                <Icon24Unpin/>
              </HeaderButton>
            ) : (
              <HeaderButton
                onClick={() => this.openSettings()}
                key="toggle_editor"
              >
                <Icon24Settings/>
              </HeaderButton>
            )}
          >
            {this.getTitle()}
          </PanelHeaderFull>
          <div className="splitContentWrap" ref='splitContentWrap'>
            <div ref="editorWrap" className="editorWrap">
              {this.state.editorType !== 'ace' ? (
                <textarea
                  onChange={(e) => this.codeOnUpdate(e.target.value)}
                  defaultValue={this.state.value}
                  ref="editorTextarea"
                />
              ) : (
                <AceEditor
                  mode="javascript"
                  theme={this.state.dark ? "tomorrow_night" : "chrome"}
                  onChange={(e) => this.codeOnUpdate(e)}
                  className="editor"
                  value={this.state.value}
                  name="ace_editor"
                  width={this.state.editorWidth}
                  height={this.state.editorHeight}
                  ref="editorAce"
                  editorProps={{$blockScrolling: true}}
                  enableBasicAutocompletion={true}
                  enableLiveAutocompletion={true}
                  showPrintMargin={false}
                />
              )}
            </div>
            <div className="consoleTabsContainer">
              <Tabs type="buttons">
                <HorizontalScroll>
                  {this.state.tabs.map((tab) =>
                    <TabsItem
                      key={tab.name}
                      onClick={() => this.tabSwitch(tab)}
                      selected={this.state.activeTab === tab}
                    >
                      <span>{tab.name}</span>
                      <Icon16Cancel className="tabControl tabClose" onClick={(event) => this.tabClose(tab, event)}/>
                    </TabsItem>
                  )}
                  <TabsItem level="tertiary" style={{zIndex: 1000}} onClick={() => this.codeStartScript()}>
                    <Icon16Add className="tabControl tabStart"/>
                  </TabsItem>
                </HorizontalScroll>
              </Tabs>
              <div className="tabsContent iframeWrap" ref="tabsContent">
                <div ref="consoleOutput">
                  <Console
                    logs={this.state.logs}
                    styles={ConsoleStyles}
                  />
                </div>
              </div>
            </div>
          </div>
        </Panel>
      </View>
    );
  }
}

export default App;
