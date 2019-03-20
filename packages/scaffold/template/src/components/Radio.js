import React, { Component } from "react";
import PropTypes from "prop-types";
import classnames from "classnames";
import css from "./Radio.css";
import { uid } from "../utils";

export class Radio extends Component {
  constructor(props) {
    super(props);
    this.state = { focus: false };
    this._id = uid("radio");
    this.handleOnChange = this.handleOnChange.bind(this);
    this.handleOnFocus = this.handleOnFocus.bind(this);
    this.handleOnBlur = this.handleOnBlur.bind(this);
  }

  handleOnChange(event) {
    const { onChange } = this.props;
    const { name, value } = event.target;
    onChange && onChange(event, name, value);
  }
  handleOnFocus() {
    this.setState({ focus: true });
  }

  handleOnBlur() {
    this.setState({ focus: false });
  }

  render() {
    const { checked, disabled, id = this._id, name, value, label } = this.props;
    return (
      <div
        className={classnames(css.root, {
          [css.focus]: this.state.focus,
          [css.checked]: checked,
          [css.disabled]: disabled
        })}
      >
        <input
          checked={checked}
          id={id}
          name={name}
          onChange={this.handleOnChange}
          onFocus={this.handleOnFocus}
          onBlur={this.handleOnBlur}
          type="radio"
          value={value}
        />
        {label && (
          <label className={css.label} htmlFor={id}>
            {label}
          </label>
        )}
      </div>
    );
  }
}

export default Radio;

Radio.propTypes = {
  name: PropTypes.string,
  value: PropTypes.string,
  checked: PropTypes.bool,
  disabled: PropTypes.bool,
  id: PropTypes.string,
  label: PropTypes.string,
  onChange: PropTypes.func
};
