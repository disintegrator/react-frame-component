import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { FrameContextProvider } from './Context';
import Content from './Content';

export class Frame extends Component {
  // React warns when you render directly into the body since browser extensions
  // also inject into the body and can mess up React. For this reason
  // initialContent is expected to have a div inside of the body
  // element that we render react into.
  static propTypes = {
    style: PropTypes.object, // eslint-disable-line
    head: PropTypes.node,
    initialContent: PropTypes.string,
    mountTarget: PropTypes.string,
    contentDidMount: PropTypes.func,
    contentDidUpdate: PropTypes.func,
    children: PropTypes.oneOfType([
      PropTypes.element,
      PropTypes.arrayOf(PropTypes.element)
    ])
  };

  static defaultProps = {
    style: {},
    head: null,
    children: undefined,
    mountTarget: undefined,
    contentDidMount: () => {},
    contentDidUpdate: () => {},
    initialContent:
      '<!DOCTYPE html><html><head></head><body><div class="frame-root"></div></body></html>'
  };

  constructor(props, context) {
    super(props, context);
    this._isMounted = false;
    this.nodeRef = React.createRef();
    this.state = { iframeLoaded: false };
  }

  componentDidMount() {
    this._isMounted = true;

    const doc = this.getDoc();
    if (doc && doc.readyState === 'complete') {
      this.forceUpdate();
    } else {
      this.nodeRef.current.addEventListener('load', this.handleLoad);
    }
  }

  componentWillUnmount() {
    this._isMounted = false;

    this.nodeRef.current.removeEventListener('load', this.handleLoad);
  }

  getDoc() {
    return this.nodeRef.current ? this.nodeRef.current.contentDocument : null; // eslint-disable-line
  }

  getMountTarget() {
    const doc = this.getDoc();
    if (this.props.mountTarget) {
      return doc.querySelector(this.props.mountTarget);
    }
    return doc.body.children[0];
  }

  setRef = node => {
    this.nodeRef.current = node;

    const { forwardedRef } = this.props; // eslint-disable-line react/prop-types
    if (typeof forwardedRef === 'function') {
      forwardedRef(node);
    } else if (forwardedRef) {
      forwardedRef.current = node;
    }
  };

  handleLoad = () => {
    this.setState({ iframeLoaded: true });
  };

  renderFrameContents() {
    if (!this._isMounted) {
      return null;
    }

    const doc = this.getDoc();

    if (!doc) {
      return null;
    }

    const contentDidMount = this.props.contentDidMount;
    const contentDidUpdate = this.props.contentDidUpdate;

    const win = doc.defaultView || doc.parentView;
    const contents = (
      <Content
        contentDidMount={contentDidMount}
        contentDidUpdate={contentDidUpdate}
      >
        <FrameContextProvider value={{ document: doc, window: win }}>
          <div className="frame-content">{this.props.children}</div>
        </FrameContextProvider>
      </Content>
    );

    const mountTarget = this.getMountTarget();

    return [
      ReactDOM.createPortal(this.props.head, this.getDoc().head),
      ReactDOM.createPortal(contents, mountTarget)
    ];
  }

  render() {
    const props = {
      ...this.props,
      srcDoc: this.props.initialContent,
      children: undefined // The iframe isn't ready so we drop children from props here. #12, #17
    };
    delete props.head;
    delete props.initialContent;
    delete props.mountTarget;
    delete props.contentDidMount;
    delete props.contentDidUpdate;
    delete props.forwardedRef;
    return (
      <iframe {...props} ref={this.setRef} onLoad={this.handleLoad}>
        {this.state.iframeLoaded && this.renderFrameContents()}
      </iframe>
    );
  }
}

export default React.forwardRef((props, ref) => (
  <Frame {...props} forwardedRef={ref} />
));
