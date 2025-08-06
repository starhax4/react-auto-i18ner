// Before transformation
import React from 'react';

interface User {
  name: string;
  email: string;
}

interface Props {
  user: User;
  onSubmit: () => void;
}

function UserProfile({ user, onSubmit }: Props) {
  return (
    <div className="user-profile">
      <h1>User Profile</h1>
      <div>
        <label>Name:</label>
        <span>{user.name}</span>
      </div>
      <div>
        <label>Email:</label>
        <span>{user.email}</span>
      </div>
      <button onClick={onSubmit}>Save Changes</button>
      <input
        type="email"
        placeholder="Enter new email"
        aria-label="Email input field"
      />
    </div>
  );
}

export default UserProfile;
