import React from 'react';
import { PanelHeader, HeaderButton, Alert, Input } from '@vkontakte/vkui';
import connect from '@vkontakte/vkui-connect';


// region PanelHeader
import Icon24Fullscreen from '@vkontakte/icons/dist/24/fullscreen';
import Icon24FullscreenExit from '@vkontakte/icons/dist/24/fullscreen_exit';

class PanelHeaderInternal extends PanelHeader {
  get webviewType () {
    const isWeb = this.props.isWeb;
    return isWeb ? 'internal' : 'vkapps';
  }
}

class ScrollableAlert extends React.Component {
  constructor(props) {
    super(props);
    this.alert = React.createRef();
  }

  static cancelBubble(event) {
    event.cancelBubble = true;
  }

  getRoot() {
    return this.alert.current.element.current;
  }

  componentDidMount() {
    this.getRoot().addEventListener('touchmove', ScrollableAlert.cancelBubble);
  }

  componentWillUnmount() {
    this.getRoot().removeEventListener('touchmove', ScrollableAlert.cancelBubble);
  }

  render() {
    return <Alert ref={this.alert} {...this.props}/>
  }
}


class PanelHeaderFull extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      fullScreenEnabled: false
    };
  }

  onFullScreenUpdate = () => {
    const fullScreenEnabled = !!document.fullscreenElement;
    this.setState({ fullScreenEnabled });
  };

  fullScreenToggle() {
    const self = PanelHeaderFull;
    if (!document.fullscreenElement) {
      self.openFullscreen(document.documentElement);
    } else {
      self.closeFullscreen();
    }
    this.onFullScreenUpdate();
  }

  static openFullscreen() {
    var elem = document.body;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.mozRequestFullScreen) { /* Firefox */
      elem.mozRequestFullScreen();
    } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { /* IE/Edge */
      elem.msRequestFullscreen();
    }
  }

  static closeFullscreen() {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.mozCancelFullScreen) { /* Firefox */
      document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) { /* Chrome, Safari and Opera */
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) { /* IE/Edge */
      document.msExitFullscreen();
    }
  }

  componentDidMount() {
    window.addEventListener('fullscreenchange', this.onFullScreenUpdate);
  }

  componentWillUnmount() {
    window.removeEventListener('fullscreenchange', this.onFullScreenUpdate);
  }

  render() {
    const props = this.props;

    if (!props.isWeb) {
      return (
        <PanelHeader {...props}/>
      );
    }

    const newProps = {};
    newProps.theme = 'alternate';
    newProps.right = (
      <HeaderButton onClick={() => this.fullScreenToggle()}>
        { this.state.fullScreenEnabled ? (
          <Icon24FullscreenExit/>
        ) : (
          <Icon24Fullscreen/>
        )}
      </HeaderButton>
    );

    return (
      <PanelHeaderInternal {...props} {...newProps}/>
    )
  }
}

// endregion
// region theme path VK App

function SetWebTheme(isWeb) {
  connect.subscribe((e) => {
    switch (e.detail.type) {
      case 'VKWebAppInitResult':
      case 'VKWebAppUpdateConfig':
        let schemeAttribute = document.createAttribute('scheme');
        if (isWeb) {
          schemeAttribute.value = 'bright_light';
        } else {
          schemeAttribute.value = e.detail.data.scheme ? e.detail.data.scheme : 'bright_light';
        }
        document.body.attributes.setNamedItem(schemeAttribute);
        break;
    }
  });
}

// region PromiseAPI

class PromiseAPI {
  constructor(token) {
    this.connect  = connect;
    this.requests = {};
    this.access_token = false;
    this.view = false;
    this.v = 5.92;

    this.connect.subscribe((e) => {
      switch (e.detail.type) {
        case 'VKWebAppCallAPIMethodFailed':
          this.parseError(e.detail.data);
          break;
        case 'VKWebAppCallAPIMethodResult':
          this.parseResponse(e.detail.data);
          break;
      }
    });
  }

  showCaptcha(method, params, error) {
    if (!this.view) {
      throw error;
    }

    return new Promise((resolve) => {
      const view = this.view;
      view.setState({
        popout: (
          <Alert
            actionsLayout="vertical"
            actions={[{
              title: 'OK',
              autoclose: true,
            }]}
            onClose={() => {
              resolve(view.state.captchaCode);
              view.setState({ popout: null, captchaCode: null });
            }}
          >
            <h2>Введите код с картинки</h2>
            <img src={error.captcha_img} alt={error.captcha_img} />
            <Input onChange={(e) => {
              const captchaCode = e.currentTarget.value;
              view.setState({ captchaCode });
            }}/>
          </Alert>
        )
      });
    }).then((captcha_key) => {
      const captcha_sid = error.captcha_sid;
      return this.callMethod(method, {
        ...params,
        captcha_key,
        captcha_sid,
      });
    });
  }

  getMethod(method) {
    return this.callMethod.bind(this, method);
  }

  callMethod = (method, params) => {
    return new Promise((resolve, reject) => {
      const request_id = (Math.random() * 1e20).toString(32);
      const data = { method, params, request_id };

      params.access_token = this.access_token;
      params.v = this.v;

      this.requests[request_id] = {resolve, reject, ...data};
      this.connect.send('VKWebAppCallAPIMethod', data);
    }).catch((error) => {
      const errorCode = error ? error.error_code : 0;

      switch (errorCode) {
        case 6:
          return this.callMethod(method, params);
        case 14:
          return this.showCaptcha(method, params, error);
      }

      throw error;
    });
  };

  parseError = (data) => {
    const {error_data, request_id} = data;
    if (!this.requests[request_id]) return;
    this.requests[request_id].reject(error_data);
    delete this.requests[request_id];
  };

  parseResponse = (data) => {
    const {response, request_id} = data;
    if (!this.requests[request_id]) return;
    this.requests[request_id].resolve(response);
    delete this.requests[request_id];
  };
}


function getArgs() {
  const Args = window.location.search
    .substr(1)
    .split("&")
    .reduce(function parseArg(prev, data) {
      const [keyRaw, valueRaw] = data.split("=");
      const key = keyRaw.replace(/^vk_/, '');
      const value = decodeURIComponent(valueRaw || "");

      if (/^vk_/.test(keyRaw)) {
        prev[key] = value;
      }

      return prev;
    }, {});

  Args.uid = Args.user_id;

  return Args;
}


export {
  PanelHeaderFull,
  SetWebTheme,
  PromiseAPI,
  ScrollableAlert,
  getArgs,
};
