export type BrowserProfile = {
    id: string;
    name: string;
    partition: string;
    createdAt: string;
    avatarColor: string;
};
export declare function listProfiles(): BrowserProfile[];
export declare function getActiveProfileId(): string | null;
export declare function createProfile(name: string): BrowserProfile;
export declare function deleteProfile(profileId: string): void;
export declare function renameProfile(profileId: string, name: string): void;
export declare function setActiveProfile(profileId: string): void;
