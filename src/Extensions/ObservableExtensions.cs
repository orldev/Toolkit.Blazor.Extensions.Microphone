using System.Reactive.Linq;

namespace Toolkit.Blazor.Extensions.Microphone.Extensions;

/// <summary>
/// Provides extension methods for <see cref="IObservable{T}"/> sequences.
/// </summary>
public static class ObservableExtensions
{
    /// <summary>
    /// Filters an observable sequence to remove consecutive duplicate byte arrays.
    /// </summary>
    /// <param name="source">The observable sequence to filter.</param>
    /// <returns>
    /// An observable sequence that contains only distinct contiguous elements from the source sequence.
    /// Byte arrays are considered equal if they have the same length and all bytes are equal.
    /// </returns>
    /// <remarks>
    /// This method uses a <see cref="ByteArrayEqualityComparer"/> to compare byte arrays.
    /// Null values are considered not equal to any other value, including other null values.
    /// </remarks>
    public static IObservable<byte[]> RemoveDuplicates(this IObservable<byte[]> source)
    {
        return source.DistinctUntilChanged(new ByteArrayEqualityComparer());
    }

    /// <summary>
    /// Provides equality comparison for byte arrays.
    /// </summary>
    private class ByteArrayEqualityComparer : IEqualityComparer<byte[]>
    {
        /// <summary>
        /// Determines whether two byte arrays are equal.
        /// </summary>
        /// <param name="x">The first byte array to compare.</param>
        /// <param name="y">The second byte array to compare.</param>
        /// <returns>
        /// true if the byte arrays are either the same reference or have the same length and all bytes are equal;
        /// false if either array is null or if they have different content.
        /// </returns>
        public bool Equals(byte[]? x, byte[]? y)
        {
            if (ReferenceEquals(x, y)) return true;
            if (x == null || y == null) return false;
            
            var minLength = Math.Min(x.Length, y.Length);
            for (var i = 0; i < minLength; i++)
            {
                if (x[i] != y[i]) return false;
            }
            
            return true; 
        }

        /// <summary>
        /// Returns a hash code for the specified byte array.
        /// </summary>
        /// <param name="obj">The byte array for which to get a hash code.</param>
        /// <returns>A hash code for the byte array.</returns>
        /// <remarks>
        /// The hash code is calculated using a simple algorithm that combines the hash codes of all bytes in the array.
        /// </remarks>
        public int GetHashCode(byte[] obj)
        {
            // Simple hash code implementation for byte arrays
            unchecked
            {
                return obj.Aggregate(17, (current, b) => current * 31 + b);
            }
        }
    }
}