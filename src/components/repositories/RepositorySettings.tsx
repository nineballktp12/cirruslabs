import React, { useState } from 'react';
import { useFragment, useMutation } from 'react-relay';

import { graphql } from 'babel-plugin-relay/macro';

import mui from 'mui';

import {
  RepositorySettingsMutation,
  RepositorySettingsMutation$data,
  RepositorySettingsMutation$variables,
} from './__generated__/RepositorySettingsMutation.graphql';
import { RepositorySettings_repository$key } from './__generated__/RepositorySettings_repository.graphql';

interface Props {
  repository: RepositorySettings_repository$key;
}

export default function RepositorySettings(props: Props) {
  let repository = useFragment(
    graphql`
      fragment RepositorySettings_repository on Repository {
        id
        settings {
          needsApproval
          decryptEnvironmentVariables
          configResolutionStrategy
          additionalEnvironment
          cacheVersion
          oidcSubIncludeClaimKeys
        }
      }
    `,
    props.repository,
  );

  let [initialSettings, setInitialSettings] = useState(repository.settings);
  let [settings, setSettings] = useState(repository.settings);
  let [additionalEnvironmentToAdd, setAdditionalEnvironmentToAdd] = useState('');

  let changeField = field => {
    return event => {
      let value = event.target.value;
      setSettings({
        ...settings,
        [field]: value,
      });
    };
  };

  let setClearCaches = (event, checked) => {
    const cacheVersion = checked ? initialSettings.cacheVersion + 1 : initialSettings.cacheVersion;

    setSettings({
      ...settings,
      cacheVersion: cacheVersion,
    });
  };

  let toggleField = field => {
    return event => {
      setSettings({
        ...settings,
        [field]: !settings[field],
      });
    };
  };

  let addNewEnvVariable = () => {
    setAdditionalEnvironmentToAdd('');
    setSettings({
      ...settings,
      additionalEnvironment: (settings.additionalEnvironment || []).concat(additionalEnvironmentToAdd),
    });
  };

  let deleteEnv = line => {
    setSettings({
      ...settings,
      additionalEnvironment: (settings.additionalEnvironment || []).filter(value => line !== value),
    });
  };

  const [commitSaveSettingsMutation] = useMutation<RepositorySettingsMutation>(graphql`
    mutation RepositorySettingsMutation($input: RepositorySettingsInput!) {
      saveSettings(input: $input) {
        settings {
          needsApproval
          decryptEnvironmentVariables
          configResolutionStrategy
          additionalEnvironment
          cacheVersion
          oidcSubIncludeClaimKeys
        }
      }
    }
  `);

  function onSave() {
    const variables: RepositorySettingsMutation$variables = {
      input: {
        clientMutationId: 'save-settings-' + repository.id,
        repositoryId: repository.id,
        needsApproval: settings.needsApproval,
        decryptEnvironmentVariables: settings.decryptEnvironmentVariables,
        configResolutionStrategy: settings.configResolutionStrategy,
        additionalEnvironment: settings.additionalEnvironment.concat(),
        cacheVersion: settings.cacheVersion,
        oidcSubIncludeClaimKeys: settings.oidcSubIncludeClaimKeys.concat(),
      },
    };

    commitSaveSettingsMutation({
      variables: variables,
      onCompleted: (response: RepositorySettingsMutation$data, errors) => {
        if (errors) {
          console.log(errors);
          return;
        }
        setInitialSettings(response.saveSettings.settings);
      },
      onError: err => console.error(err),
    });
  }

  let areSettingsTheSame =
    settings.needsApproval === initialSettings.needsApproval &&
    settings.configResolutionStrategy === initialSettings.configResolutionStrategy &&
    JSON.stringify(settings.additionalEnvironment) === JSON.stringify(initialSettings.additionalEnvironment) &&
    JSON.stringify(settings.oidcSubIncludeClaimKeys) === JSON.stringify(initialSettings.oidcSubIncludeClaimKeys) &&
    settings.decryptEnvironmentVariables === initialSettings.decryptEnvironmentVariables &&
    settings.cacheVersion === initialSettings.cacheVersion;
  return (
    <mui.Card elevation={24}>
      <mui.CardContent>
        <mui.FormControl fullWidth variant="standard">
          <mui.FormControlLabel
            control={<mui.Switch checked={settings.needsApproval} onChange={toggleField('needsApproval')} />}
            label="Require approval for builds from users without write permissions"
          />
        </mui.FormControl>
        <mui.FormControl fullWidth variant="standard">
          <mui.FormHelperText>Decrypt Secured Environment Variables for builds initialized by:</mui.FormHelperText>
          <mui.Select
            value={settings.decryptEnvironmentVariables}
            onChange={changeField('decryptEnvironmentVariables')}
            fullWidth
            variant="standard"
          >
            <mui.MenuItem value={'USERS_WITH_WRITE_PERMISSIONS'}>Only users with write permissions</mui.MenuItem>
            <mui.MenuItem value={'COLLABORATORS'}>Collaborators, bots and users with write permissions</mui.MenuItem>
            <mui.MenuItem value={'EVERYONE'}>Everyone</mui.MenuItem>
          </mui.Select>
        </mui.FormControl>
        <mui.FormControl fullWidth variant="standard">
          <mui.FormHelperText>Config resolution strategy:</mui.FormHelperText>
          <mui.Select
            value={settings.configResolutionStrategy}
            onChange={changeField('configResolutionStrategy')}
            fullWidth
            variant="standard"
          >
            <mui.MenuItem value={'SAME_SHA'}>Same SHA</mui.MenuItem>
            <mui.MenuItem value={'MERGE_FOR_PRS'}>Merge for PRs</mui.MenuItem>
            <mui.MenuItem value={'DEFAULT_BRANCH'}>Latest from default branch</mui.MenuItem>
          </mui.Select>
        </mui.FormControl>
        <mui.FormControl fullWidth variant="standard">
          <mui.InputLabel htmlFor="oidc-sub-extra-claims">
            Extra claims to include in the OIDC sub claim (comma separated). For example, "branch,user_permission".
          </mui.InputLabel>
          <mui.Input
            id="oidc-sub-extra-claims"
            value={settings.oidcSubIncludeClaimKeys.join(',')}
            onChange={event =>
              setSettings({
                ...settings,
                oidcSubIncludeClaimKeys: event.target.value.split(','),
              })
            }
          />
        </mui.FormControl>
        {settings.additionalEnvironment.length > 0 && (
          <mui.FormControl fullWidth variant="standard">
            <mui.FormHelperText>Environment variable overrides</mui.FormHelperText>
            <mui.List>
              {settings.additionalEnvironment.map(line => (
                <mui.ListItem key={line}>
                  <mui.ListItemText primary={line} />
                  <mui.ListItemSecondaryAction>
                    <mui.IconButton edge="end" aria-label="delete" onClick={() => deleteEnv(line)} size="large">
                      <mui.icons.Delete />
                    </mui.IconButton>
                  </mui.ListItemSecondaryAction>
                </mui.ListItem>
              ))}
            </mui.List>
          </mui.FormControl>
        )}
        <mui.FormControl fullWidth variant="standard">
          <mui.InputLabel htmlFor="override-env-var">
            New Environment Variable Override (FOO=Bar or FOO=ENCRYPTED[...])
          </mui.InputLabel>
          <mui.Input
            id="override-env-var"
            value={additionalEnvironmentToAdd}
            onChange={event => setAdditionalEnvironmentToAdd(event.target.value)}
            endAdornment={
              <mui.InputAdornment position="end">
                <mui.IconButton aria-label="add new env variable override" onClick={addNewEnvVariable} size="large">
                  <mui.icons.AddCircle />
                </mui.IconButton>
              </mui.InputAdornment>
            }
          />
        </mui.FormControl>
        <mui.FormControl fullWidth variant="standard">
          <mui.FormControlLabel
            control={
              <mui.Checkbox
                checked={initialSettings.cacheVersion !== settings.cacheVersion}
                onChange={setClearCaches}
              />
            }
            label="Clear all repository caches"
          />
        </mui.FormControl>
      </mui.CardContent>
      <mui.CardActions>
        <mui.Button variant="contained" disabled={areSettingsTheSame} onClick={() => onSave()}>
          Save
        </mui.Button>
      </mui.CardActions>
    </mui.Card>
  );
}
