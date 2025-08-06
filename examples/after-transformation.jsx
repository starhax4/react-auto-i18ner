// After transformation (JavaScript version)
import React from 'react';
import { useTranslation } from 'react-i18next';

function UserProfile({ user, onSubmit }) {
  const { t } = useTranslation();

  return (
    <div className="user-profile">
      <h1>{t('User Profile')}</h1>
      <div>
        <label>{t('Name:')}</label>
        <span>{user.name}</span>
      </div>
      <div>
        <label>{t('Email:')}</label>
        <span>{user.email}</span>
      </div>
      <button onClick={onSubmit}>{t('Save Changes')}</button>
      <input
        type="email"
        placeholder={t('Enter new email')}
        aria-label={t('Email input field')}
      />
    </div>
  );
}

export default UserProfile;
