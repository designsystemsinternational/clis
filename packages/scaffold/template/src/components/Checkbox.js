import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { uid } from '../utils';
import classnames from 'classnames';
import css from './Checkbox.css';

export class Checkbox extends Component {
	constructor(props) {
		super(props);
		this._id = uid('checkbox');
		this.handleOnChange = this.handleOnChange.bind(this);
	}

	handleOnChange(event) {
		const { name, checked } = event.target;
		const { value = true, onChange } = this.props;
		const returnValue = checked ? value : false;
		onChange && onChange(event, name, returnValue);
	}

	render() {
		const { checked, disabled, id = this._id, label, name, value } = this.props;
		return (
			<div
				className={classnames(css.root, {
					[css.checked]: checked,
					[css.disabled]: disabled
				})}>
				<input
					checked={checked}
					disabled={disabled}
					id={id}
					name={name}
					onChange={this.handleOnChange}
					type="checkbox"
					value={value}
				/>
				{label && <label htmlFor={id}>{label}</label>}
			</div>
		);
	}
}

export default Checkbox;

Checkbox.propTypes = {
	name: PropTypes.string,
	value: PropTypes.string,
	label: PropTypes.string.isRequired,
	id: PropTypes.string,
	onChange: PropTypes.func,
	checked: PropTypes.bool,
	disabled: PropTypes.bool
};
