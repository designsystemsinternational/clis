import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { uid } from '../utils';
import css from './Input.css';

export class Input extends Component {
	constructor(props) {
		super(props);
		this.state = {
			focus: false
		};
		this._id = uid('input');
		this.handleOnChange = this.handleOnChange.bind(this);
		this.handleOnFocus = this.handleOnFocus.bind(this);
		this.handleOnBlur = this.handleOnBlur.bind(this);
	}

	handleOnChange(event) {
		const { name, value } = event.target;
		const { onChange } = this.props;
		onChange && onChange(event, name, value);
	}

	handleOnFocus() {
		this.setState({ focus: true });
	}

	handleOnBlur() {
		this.setState({
			focus: false
		});
	}

	render() {
		const {
			className,
			disabled,
			autocomplete,
			error,
			id = this._id,
			invalid = false,
			label,
			name,
			onKeyPress,
			placeholder,
			required = false,
			type,
			value
		} = this.props;

		const { focus } = this.state;
		const rootClasses = classnames(css.root, {
			[className]: className,
			[css.invalid]: invalid,
			[css.disabled]: disabled,
			[css.focus]: focus
		});

		return (
			<div style={css} className={rootClasses}>
				{label && <label htmlFor={id}>{label}</label>}
				<input
					autoComplete={autocomplete}
					id={id}
					name={name}
					type={type}
					value={value}
					placeholder={placeholder}
					disabled={disabled}
					onFocus={this.handleOnFocus}
					onBlur={this.handleOnBlur}
					onChange={this.handleOnChange}
					onKeyPress={onKeyPress}
					aria-required={required}
					aria-describedby={`error-${id}`}
					aria-invalid={invalid}
				/>
				{invalid && error && (
					<div className={css.errorWrapper}>
						<span id={`error-${id}`} className={css.errorTxt} aria-live="polite">
							{error}
						</span>
					</div>
				)}
			</div>
		);
	}
}

export default Input;

Input.defaultProps = {
	type: 'text',
	autocomplete: 'off',
	onChange: () => {}
};

Input.propTypes = {
	name: PropTypes.string,
	value: PropTypes.string,
	type: PropTypes.string,
	label: PropTypes.string.isRequired,
	className: PropTypes.string,
	autocomplete: PropTypes.string,
	disabled: PropTypes.bool,
	error: PropTypes.string,
	id: PropTypes.string,
	invalid: PropTypes.bool,
	onChange: PropTypes.func,
	onKeyPress: PropTypes.func,
	placeholder: PropTypes.string,
	required: PropTypes.bool
};
