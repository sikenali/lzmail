package crypto

import (
	"crypto/aes"
	"log"
	"crypto/cipher"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"os"
)

func encryptionKey() []byte {
	key := os.Getenv("ENCRYPTION_KEY")
	if key == "" {
		log.Println("[WARN] ENCRYPTION_KEY not set - passwords stored in plaintext (development mode)")
		return nil
	}
	decoded, err := hex.DecodeString(key)
	if err != nil || len(decoded) != 32 {
		return nil
	}
	return decoded
}

func Encrypt(plaintext string) (string, error) {
	key := encryptionKey()
	if key == nil {
		return plaintext, nil
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, aesGCM.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}
	ciphertext := aesGCM.Seal(nil, nonce, []byte(plaintext), nil)
	return hex.EncodeToString(nonce) + hex.EncodeToString(ciphertext), nil
}

func Decrypt(encoded string) (string, error) {
	key := encryptionKey()
	if key == nil {
		return encoded, nil
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonceSize := aesGCM.NonceSize()
	if len(encoded) < nonceSize*2 {
		return "", errors.New("ciphertext too short")
	}
	nonce, err := hex.DecodeString(encoded[:nonceSize*2])
	if err != nil {
		return "", err
	}
	ciphertext, err := hex.DecodeString(encoded[nonceSize*2:])
	if err != nil {
		return "", err
	}
	plaintext, err := aesGCM.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", fmt.Errorf("decrypt failed: %w", err)
	}
	return string(plaintext), nil
}
